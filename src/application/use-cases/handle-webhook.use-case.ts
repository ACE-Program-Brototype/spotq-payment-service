import type {
	HandleWebhookInput,
	HandleWebhookOutput,
} from '@application/dtos/handle-webhook.dto.ts';
import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { IHandleWebhookUseCase } from '@application/ports/use-cases/handle-webhook.use-case.port.ts';
import { config } from '@config/index.ts';
import { TYPES } from '@di/types.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	DEFAULT_PAYMENT_FAILURE_REASON,
	DEFAULT_PAYMENT_METHOD,
	PAYMENT_EVENTS,
	PAYMENT_STATUS,
	RAZORPAY_WEBHOOK_EVENTS,
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
		@inject(TYPES.Services.OutboxRelayService)
		private readonly outboxRelayService: IOutboxRelayService,
	) {}

	async execute(params: HandleWebhookInput): Promise<HandleWebhookOutput> {
		const webhookSecret = config.razorpay.webhookSecret || config.razorpay.keySecret;

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

		logger.info({ eventType, paymentId: paymentEntity?.id }, 'Processing Razorpay webhook event');

		if (
			(eventType === RAZORPAY_WEBHOOK_EVENTS.PAYMENT_CAPTURED ||
				eventType === RAZORPAY_WEBHOOK_EVENTS.ORDER_PAID) &&
			(paymentEntity || params.parsedPayload.payload?.order?.entity)
		) {
			const orderEntity = params.parsedPayload.payload?.order?.entity;
			const orderId = paymentEntity?.order_id || orderEntity?.id;
			const paymentId = paymentEntity?.id || '';

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
				const resolvedPaymentId = paymentId || existingTx.razorpayPaymentId || '';

				existingTx.capture({
					paymentId: resolvedPaymentId,
					signature: '',
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
			const currentPeriodEnd = plan.calculatePeriodEnd(now);

			await this.subscriptionRepository.activateSubscriptionWithOutbox({
				subscription: {
					restaurantId: existingTx.restaurantId,
					planId: plan.id,
					status: SUBSCRIPTION_STATUS.ACTIVE,
					currentPeriodStart: now,
					currentPeriodEnd: currentPeriodEnd,
				},
				payment: {
					razorpayOrderId: existingTx.razorpayOrderId,
					razorpayPaymentId: paymentId,
					razorpaySignature: '',
				},
				outbox: {
					eventType: SUBSCRIPTION_EVENTS.ACTIVATED,
					aggregateId: existingTx.restaurantId,
					payload: {
						restaurantId: existingTx.restaurantId,
						planCode: plan.code,
						status: SUBSCRIPTION_STATUS.ACTIVE,
						currentPeriodStart: now.toISOString(),
						currentPeriodEnd: currentPeriodEnd.toISOString(),
						timestamp: now.toISOString(),
					},
				},
			});

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
					await this.paymentTransactionRepository.markFailed(orderId, failureReason);
					logger.info(
						{ orderId, failureReason },
						'Payment transaction marked as FAILED from webhook',
					);
				}
			}
		}

		return { received: true };
	}
}
