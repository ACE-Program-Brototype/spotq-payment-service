import type { WebhookPayload } from '@application/dtos/handle-webhook.dto.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { RAZORPAY_WEBHOOK_EVENTS, REFUND_STATUS } from '@shared/constants/index.ts';
import type { IWebhookEventHandler } from './webhook-event-handler.interface.ts';

/**
 * Handles `refund.processed` and `refund.failed` Razorpay webhook events.
 */
export class RefundWebhookHandler implements IWebhookEventHandler {
	readonly supportedEvents = [
		RAZORPAY_WEBHOOK_EVENTS.REFUND_PROCESSED,
		RAZORPAY_WEBHOOK_EVENTS.REFUND_FAILED,
	] as const;

	constructor(private readonly paymentTransactionRepository: IPaymentTransactionRepository) {}

	async handle(eventType: string, parsedPayload: WebhookPayload): Promise<void> {
		const refundEntity = parsedPayload.payload?.refund?.entity;
		const paymentEntity = parsedPayload.payload?.payment?.entity;

		const refundId = refundEntity?.id;
		if (!refundId) {
			logger.warn('Refund webhook received without valid refund entity id; acknowledging');
			return;
		}

		const refundStatus =
			eventType === RAZORPAY_WEBHOOK_EVENTS.REFUND_PROCESSED
				? REFUND_STATUS.PROCESSED
				: REFUND_STATUS.FAILED;

		const paymentId = refundEntity.payment_id || paymentEntity?.id || null;
		const arn = refundEntity.arn ?? null;
		const reason =
			typeof refundEntity.notes?.reason === 'string' ? refundEntity.notes.reason : null;

		await this.paymentTransactionRepository.syncRefundFromWebhook({
			razorpayRefundId: refundId,
			razorpayPaymentId: paymentId,
			status: refundStatus,
			amountPaise: refundEntity.amount,
			currency: refundEntity.currency,
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
	}
}
