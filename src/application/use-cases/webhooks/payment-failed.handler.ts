import type { WebhookPayload } from '@application/dtos/handle-webhook.dto.ts';
import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	DEFAULT_PAYMENT_FAILURE_REASON,
	PAYMENT_EVENTS,
	PAYMENT_STATUS,
	RAZORPAY_WEBHOOK_EVENTS,
} from '@shared/constants/index.ts';
import type { IWebhookEventHandler } from './webhook-event-handler.interface.ts';

/**
 * Handles `payment.failed` webhooks for food orders and subscription transactions.
 */
export class PaymentFailedHandler implements IWebhookEventHandler {
	readonly supportedEvents = [RAZORPAY_WEBHOOK_EVENTS.PAYMENT_FAILED] as const;

	constructor(
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
		private readonly outboxRelayService: IOutboxRelayService,
	) {}

	async handle(_eventType: string, parsedPayload: WebhookPayload): Promise<void> {
		const paymentEntity = parsedPayload.payload?.payment?.entity;
		const orderId = paymentEntity?.order_id;
		if (!paymentEntity || !orderId) {
			return;
		}

		const existingTx = await this.paymentTransactionRepository.findByOrderId(orderId);
		if (
			!existingTx ||
			existingTx.status === PAYMENT_STATUS.SUCCESS ||
			existingTx.status === PAYMENT_STATUS.CAPTURED
		) {
			return;
		}

		const failureReason =
			paymentEntity.error_description ||
			paymentEntity.error_reason ||
			DEFAULT_PAYMENT_FAILURE_REASON;

		if (existingTx.orderId) {
			await this.failOrderPayment(existingTx, failureReason);
		} else {
			await this.paymentTransactionRepository.markFailed(orderId, failureReason);
		}

		logger.info({ orderId, failureReason }, 'Payment transaction marked as FAILED from webhook');
	}

	private async failOrderPayment(
		existingTx: PaymentTransaction,
		failureReason: string,
	): Promise<void> {
		if (!existingTx.orderId) {
			return;
		}

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
	}
}
