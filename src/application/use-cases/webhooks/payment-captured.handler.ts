import type { WebhookPayload, WebhookPaymentEntity } from '@application/dtos/handle-webhook.dto.ts';
import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { activateOrRenewSubscription } from '@domain/workflows/subscription-activation.workflow.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	DEFAULT_PAYMENT_METHOD,
	PAYMENT_EVENTS,
	PAYMENT_STATUS,
	RAZORPAY_WEBHOOK_EVENTS,
} from '@shared/constants/index.ts';
import type { IWebhookEventHandler } from './webhook-event-handler.interface.ts';

/**
 * Handles `payment.captured` and `order.paid` webhooks for food orders and subscriptions.
 */
export class PaymentCapturedHandler implements IWebhookEventHandler {
	readonly supportedEvents = [
		RAZORPAY_WEBHOOK_EVENTS.PAYMENT_CAPTURED,
		RAZORPAY_WEBHOOK_EVENTS.ORDER_PAID,
	] as const;

	constructor(
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
		private readonly planRepository: ISubscriptionPlanRepository,
		private readonly subscriptionRepository: ISubscriptionRepository,
		private readonly outboxRelayService: IOutboxRelayService,
	) {}

	async handle(_eventType: string, parsedPayload: WebhookPayload): Promise<void> {
		const paymentEntity = parsedPayload.payload?.payment?.entity;
		const orderEntity = parsedPayload.payload?.order?.entity;
		if (!paymentEntity && !orderEntity) {
			return;
		}

		const orderId = paymentEntity?.order_id || orderEntity?.id;
		if (!orderId) {
			return;
		}

		const existingTx = await this.paymentTransactionRepository.findByOrderId(orderId);
		if (!existingTx) {
			logger.warn(
				{ orderId },
				'Payment order not found for webhook event; acknowledging to prevent gateway retries',
			);
			return;
		}

		const paymentId = paymentEntity?.id ?? null;

		if (existingTx.orderId) {
			await this.handleOrderCapture(existingTx, orderId, paymentId, paymentEntity);
			return;
		}

		await this.handleSubscriptionCapture(existingTx, orderId, paymentId);
	}

	private async handleOrderCapture(
		existingTx: PaymentTransaction,
		orderId: string,
		paymentId: string | null,
		paymentEntity?: WebhookPaymentEntity,
	): Promise<void> {
		if (!existingTx.orderId) {
			return;
		}

		if (existingTx.status === PAYMENT_STATUS.CAPTURED) {
			logger.info(
				{ orderId, foodOrderId: existingTx.orderId },
				'Webhook received for already captured food order transaction (idempotent)',
			);
			return;
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
	}

	private async handleSubscriptionCapture(
		existingTx: PaymentTransaction,
		orderId: string,
		paymentId: string | null,
	): Promise<void> {
		if (existingTx.status === PAYMENT_STATUS.SUCCESS && existingTx.subscriptionId) {
			logger.info({ orderId }, 'Webhook received for already completed transaction');
			return;
		}

		if (!existingTx.planId) {
			logger.info({ orderId }, 'Webhook received for non-subscription transaction; acknowledging');
			return;
		}

		const plan = await this.planRepository.findById(existingTx.planId);
		if (!plan) {
			return;
		}

		const now = new Date();
		const subscription = await activateOrRenewSubscription({
			subscriptionRepository: this.subscriptionRepository,
			transaction: existingTx,
			plan,
			razorpayPaymentId: paymentId || existingTx.razorpayPaymentId || '',
			razorpaySignature: '',
			now,
			throwIfRenewalTargetMissing: false,
		});

		if (!subscription) {
			logger.warn(
				{
					orderId: existingTx.razorpayOrderId,
					targetSubscriptionId: existingTx.renewalTargetSubscriptionId,
				},
				'Target subscription not found for renewal webhook; skipping activation',
			);
			return;
		}

		this.outboxRelayService.processPendingEvents().catch((err) => {
			logger.error({ err }, 'Error triggering outbox relay after webhook');
		});
	}
}
