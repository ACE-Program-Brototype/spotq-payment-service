import type {
	HandleWebhookInput,
	HandleWebhookOutput,
} from '@application/dtos/handle-webhook.dto.ts';
import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { IHandleWebhookUseCase } from '@application/ports/use-cases/handle-webhook.use-case.port.ts';
import { config } from '@config/index.ts';
import { TYPES } from '@di/types.ts';
import { WALLET_LEDGER_STATUSES } from '@domain/constants/wallet-ledger.constants';
import type { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import type { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	DEFAULT_PAYMENT_FAILURE_REASON,
	DEFAULT_PAYMENT_METHOD,
	PAYMENT_EVENTS,
	PAYMENT_STATUS,
	RAZORPAY_WEBHOOK_EVENTS,
	REFUND_STATUS,
	SUBSCRIPTION_EVENTS,
	SUBSCRIPTION_STATUS,
} from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

/**
 * Use case responsible for processing external Razorpay webhook events,
 * verifying signatures, and synchronizing subscription and payment states.
 */
@injectable()
export class HandleWebhookUseCase implements IHandleWebhookUseCase {
	constructor(
		@inject(TYPES.Gateways.PaymentGateway)
		private readonly paymentGateway: IPaymentGateway,
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
		@inject(TYPES.Repositories.SubscriptionPlanRepository)
		private readonly planRepository: ISubscriptionPlanRepository,
		@inject(TYPES.Repositories.SubscriptionRepository)
		private readonly subscriptionRepository: ISubscriptionRepository,
		@inject(TYPES.Repositories.RestaurantWalletRepository)
		private readonly restaurantWalletRepository: IRestaurantWalletRepository,
		@inject(TYPES.Services.OutboxRelayService)
		private readonly outboxRelayService: IOutboxRelayService,
	) {}

	async execute(params: HandleWebhookInput): Promise<HandleWebhookOutput> {
		const webhookSecret = config.razorpay.webhookSecret;
		if (webhookSecret) {
			if (!params.signature) {
				logger.warn('Missing webhook signature rejected');
				return { received: false };
			}

			const isValid = this.paymentGateway.verifyWebhookSignature(
				params.rawBody,
				params.signature,
				webhookSecret,
			);

			if (!isValid) {
				logger.warn('Invalid webhook signature rejected');
				return { received: false };
			}
		}

		const eventType = params.parsedPayload.event;
		const paymentEntity = params.parsedPayload.payload?.payment?.entity;
		const payoutEntity = params.parsedPayload.payload?.payout?.entity;

		logger.info({ eventType, paymentId: paymentEntity?.id }, 'Processing Razorpay webhook event');

		if (eventType === RAZORPAY_WEBHOOK_EVENTS.PAYOUT_PROCESSED && payoutEntity) {
			if (payoutEntity.reference_id) {
				await this.restaurantWalletRepository.markWithdrawalProcessed(
					payoutEntity.reference_id,
					payoutEntity.utr,
				);
				logger.info(
					{ payoutId: payoutEntity.id, referenceId: payoutEntity.reference_id },
					'Payout processed webhook updated the withdrawal ledger',
				);
			} else {
				logger.warn(
					{ payoutId: payoutEntity.id },
					'Processed payout webhook did not include a reference ID',
				);
			}
			return { received: true };
		}

		if (
			(eventType === RAZORPAY_WEBHOOK_EVENTS.PAYOUT_REJECTED ||
				eventType === RAZORPAY_WEBHOOK_EVENTS.PAYOUT_FAILED ||
				eventType === RAZORPAY_WEBHOOK_EVENTS.PAYOUT_REVERSED) &&
			payoutEntity
		) {
			if (payoutEntity.reference_id) {
				const withdrawalStatus =
					eventType === RAZORPAY_WEBHOOK_EVENTS.PAYOUT_REVERSED
						? WALLET_LEDGER_STATUSES.REVERSED
						: WALLET_LEDGER_STATUSES.FAILED;
				await this.restaurantWalletRepository.failWithdrawal(
					payoutEntity.reference_id,
					withdrawalStatus,
				);
				logger.info(
					{ payoutId: payoutEntity.id, referenceId: payoutEntity.reference_id, eventType },
					'Payout failure received from Razorpay webhook; withdrawal reservation released',
				);
			} else {
				logger.warn(
					{ payoutId: payoutEntity.id, eventType },
					'Payout failure webhook did not include a reference ID',
				);
			}
			return { received: true };
		}

		if (
			(eventType === RAZORPAY_WEBHOOK_EVENTS.PAYMENT_CAPTURED ||
				eventType === RAZORPAY_WEBHOOK_EVENTS.ORDER_PAID) &&
			(paymentEntity || params.parsedPayload.payload?.order?.entity)
		) {
			const orderEntity = params.parsedPayload.payload?.order?.entity;
			const orderId = paymentEntity?.order_id || orderEntity?.id;
			const paymentId = paymentEntity?.id ?? null;

			if (!orderId) {
				return { received: true };
			}

			const existingTx = await this.paymentTransactionRepository.findByOrderId(orderId);

			if (!existingTx) {
				logger.warn(
					{ orderId },
					'Payment order not found for webhook event; acknowledging to prevent gateway retries',
				);
				return { received: true };
			}

			if (existingTx.orderId) {
				if (existingTx.status === PAYMENT_STATUS.CAPTURED) {
					logger.info(
						{ orderId, foodOrderId: existingTx.orderId },
						'Webhook received for already captured food order transaction (idempotent)',
					);
					return { received: true };
				}

				const method =
					(paymentEntity as Record<string, unknown> | undefined)?.method ?? DEFAULT_PAYMENT_METHOD;
				const resolvedPaymentId = paymentId ?? existingTx.razorpayPaymentId ?? null;

				existingTx.capture({
					paymentId: resolvedPaymentId,
					signature: null,
					metadata: { method },
				});

				await this.paymentTransactionRepository.captureOrderPaymentWithOutbox({
					transaction: existingTx,
					outbox: {
						eventType: PAYMENT_EVENTS.ORDER_CAPTURED,
						aggregateId: existingTx.orderId,
						payload: {
							paymentId: existingTx.id,
							orderId: existingTx.orderId,
							customerId: existingTx.customerId,
							restaurantId: existingTx.restaurantId,
							amountPaise: existingTx.amountPaise,
							currency: existingTx.currency,
							gatewayPaymentId: resolvedPaymentId,
							method,
							timestamp: new Date().toISOString(),
						},
					},
				});

				this.outboxRelayService.processPendingEvents().catch((err) => {
					logger.error({ err }, 'Error triggering outbox relay after food order webhook');
				});

				logger.info(
					{ orderId, foodOrderId: existingTx.orderId, paymentId },
					'Food order payment captured via Razorpay webhook safety net',
				);
				return { received: true };
			}

			// Handle Subscription Order Payment
			if (existingTx.status === PAYMENT_STATUS.SUCCESS && existingTx.subscriptionId) {
				logger.info({ orderId }, 'Webhook received for already completed transaction');
				return { received: true };
			}

			if (!existingTx.planId) {
				logger.info(
					{ orderId },
					'Webhook received for non-subscription transaction; acknowledging',
				);
				return { received: true };
			}

			const plan = await this.planRepository.findById(existingTx.planId);
			if (!plan) return { received: true };

			const now = new Date();
			const resolvedPaymentId = paymentId || existingTx.razorpayPaymentId || '';
			await this.processSubscriptionCaptureWebhook(existingTx, plan, resolvedPaymentId, now);

			this.outboxRelayService.processPendingEvents().catch((err) => {
				logger.error({ err }, 'Error triggering outbox relay after webhook');
			});
		}

		if (eventType === RAZORPAY_WEBHOOK_EVENTS.PAYMENT_FAILED && paymentEntity) {
			const orderId = paymentEntity.order_id;
			const failureReason =
				paymentEntity.error_description ||
				paymentEntity.error_reason ||
				DEFAULT_PAYMENT_FAILURE_REASON;

			if (orderId) {
				const existingTx = await this.paymentTransactionRepository.findByOrderId(orderId);
				if (
					existingTx &&
					existingTx.status !== PAYMENT_STATUS.SUCCESS &&
					existingTx.status !== PAYMENT_STATUS.CAPTURED
				) {
					if (existingTx.orderId) {
						existingTx.markFailed(failureReason);
						const now = new Date();
						await this.paymentTransactionRepository.failOrderPaymentWithOutbox({
							transaction: existingTx,
							outbox: {
								eventType: PAYMENT_EVENTS.ORDER_FAILED,
								aggregateId: existingTx.orderId,
								payload: {
									paymentId: existingTx.id,
									orderId: existingTx.orderId,
									customerId: existingTx.customerId,
									restaurantId: existingTx.restaurantId,
									amountPaise: existingTx.amountPaise,
									currency: existingTx.currency,
									failureReason,
									timestamp: now.toISOString(),
								},
							},
						});

						this.outboxRelayService.processPendingEvents().catch((err) => {
							logger.error(
								{ err },
								'Error triggering outbox relay after food order payment failure webhook',
							);
						});
					} else {
						await this.paymentTransactionRepository.markFailed(orderId, failureReason);
					}
					logger.info(
						{ orderId, failureReason },
						'Payment transaction marked as FAILED from webhook',
					);
				}
			}
		}

		if (
			eventType === RAZORPAY_WEBHOOK_EVENTS.REFUND_PROCESSED ||
			eventType === RAZORPAY_WEBHOOK_EVENTS.REFUND_FAILED
		) {
			const refundEntity = params.parsedPayload.payload?.refund?.entity;
			const paymentEntity = params.parsedPayload.payload?.payment?.entity;

			const refundId = refundEntity?.id;
			if (!refundId) {
				logger.warn('Refund webhook received without valid refund entity id; acknowledging');
				return { received: true };
			}

			const refundStatus =
				eventType === RAZORPAY_WEBHOOK_EVENTS.REFUND_PROCESSED
					? REFUND_STATUS.PROCESSED
					: REFUND_STATUS.FAILED;

			const paymentId = refundEntity.payment_id || paymentEntity?.id || null;
			const amountPaise = refundEntity.amount;
			const currency = refundEntity.currency;
			const arn = refundEntity.arn ?? null;
			const notes = refundEntity.notes;
			const reason = typeof notes?.reason === 'string' ? notes.reason : null;

			await this.paymentTransactionRepository.syncRefundFromWebhook({
				razorpayRefundId: refundId,
				razorpayPaymentId: paymentId,
				status: refundStatus,
				amountPaise,
				currency,
				arn,
				reason,
			});

			logger.info(
				{
					refundId,
					paymentId,
					status: refundStatus,
					arn,
				},
				'Processed refund webhook from Razorpay',
			);

			return { received: true };
		}

		return { received: true };
	}

	private async processSubscriptionCaptureWebhook(
		existingTx: PaymentTransaction,
		plan: SubscriptionPlan,
		razorpayPaymentId: string,
		now: Date,
	): Promise<void> {
		const targetSubscriptionId = existingTx.renewalTargetSubscriptionId;

		if (existingTx.isSubscriptionRenewal() && targetSubscriptionId) {
			const targetSub = await this.subscriptionRepository.findById(targetSubscriptionId);
			if (!targetSub) {
				logger.warn(
					{ orderId: existingTx.razorpayOrderId, targetSubscriptionId },
					'Target subscription not found for renewal webhook; skipping activation',
				);
				return;
			}

			const renewalPeriod = targetSub.calculateRenewalPeriod(plan, now);

			await this.subscriptionRepository.renewSubscriptionWithOutbox({
				subscription: {
					subscriptionId: targetSub.id,
					restaurantId: existingTx.restaurantId,
					planId: plan.id,
					status: SUBSCRIPTION_STATUS.ACTIVE,
					currentPeriodStart: renewalPeriod.currentPeriodStart,
					currentPeriodEnd: renewalPeriod.currentPeriodEnd,
				},
				payment: {
					razorpayOrderId: existingTx.razorpayOrderId,
					razorpayPaymentId,
					razorpaySignature: '',
				},
				outbox: {
					eventType: SUBSCRIPTION_EVENTS.ACTIVATED,
					aggregateId: existingTx.restaurantId,
					payload: {
						restaurantId: existingTx.restaurantId,
						planCode: plan.tierCode,
						status: SUBSCRIPTION_STATUS.ACTIVE,
						currentPeriodStart: renewalPeriod.currentPeriodStart.toISOString(),
						currentPeriodEnd: renewalPeriod.currentPeriodEnd.toISOString(),
						timestamp: now.toISOString(),
						subscriptionId: targetSub.id,
					},
				},
			});
			return;
		}

		const currentPeriodEnd = plan.calculatePeriodEnd(now);

		await this.subscriptionRepository.activateSubscriptionWithOutbox({
			subscription: {
				restaurantId: existingTx.restaurantId,
				planId: plan.id,
				status: SUBSCRIPTION_STATUS.ACTIVE,
				currentPeriodStart: now,
				currentPeriodEnd,
			},
			payment: {
				razorpayOrderId: existingTx.razorpayOrderId,
				razorpayPaymentId,
				razorpaySignature: '',
			},
			outbox: {
				eventType: SUBSCRIPTION_EVENTS.ACTIVATED,
				aggregateId: existingTx.restaurantId,
				payload: {
					restaurantId: existingTx.restaurantId,
					planCode: plan.tierCode,
					status: SUBSCRIPTION_STATUS.ACTIVE,
					currentPeriodStart: now.toISOString(),
					currentPeriodEnd: currentPeriodEnd.toISOString(),
					timestamp: now.toISOString(),
				},
			},
		});
	}
}
