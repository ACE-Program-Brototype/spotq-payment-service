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

		if (eventType === 'payment.captured' && paymentEntity) {
			const orderId = paymentEntity.order_id;
			const paymentId = paymentEntity.id;

			if (!orderId) {
				return { received: true };
			}

			const existingTx = await this.paymentTransactionRepository.findByOrderId(orderId);

			if (!existingTx) {
				logger.warn({ orderId }, 'Payment order not found for webhook event');
				return { received: true };
			}

			if (existingTx.status === 'SUCCESS' && existingTx.subscriptionId) {
				logger.info({ orderId }, 'Webhook received for already completed transaction');
				return { received: true };
			}

			const plan = await this.planRepository.findById(existingTx.planId);
			if (!plan) return { received: true };

			const now = new Date();
			const currentPeriodEnd = new Date(now);
			if (plan.billingCycle === 'YEARLY') {
				currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
			} else {
				currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
			}

			await this.subscriptionRepository.activateSubscriptionWithOutbox({
				subscription: {
					restaurantId: existingTx.restaurantId,
					planId: plan.id,
					status: 'ACTIVE',
					currentPeriodStart: now,
					currentPeriodEnd: currentPeriodEnd,
				},
				payment: {
					razorpayOrderId: existingTx.razorpayOrderId,
					razorpayPaymentId: paymentId,
					razorpaySignature: '',
				},
				outbox: {
					eventType: 'subscription.activated',
					aggregateId: existingTx.restaurantId,
					payload: {
						restaurantId: existingTx.restaurantId,
						planCode: plan.code,
						status: 'ACTIVE',
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

		if (eventType === 'payment.failed' && paymentEntity) {
			const orderId = paymentEntity.order_id;
			const failureReason =
				paymentEntity.error_description ||
				paymentEntity.error_reason ||
				'Payment failed on gateway';

			if (orderId) {
				const existingTx = await this.paymentTransactionRepository.findByOrderId(orderId);
				if (existingTx && existingTx.status !== 'SUCCESS') {
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
