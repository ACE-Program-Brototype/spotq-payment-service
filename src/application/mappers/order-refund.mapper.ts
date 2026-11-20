import type { ProcessOrderRefundOutput } from '@application/dtos/process-order-refund.dto.ts';
import type { PaymentRefund } from '@domain/entities/payment-refund.entity.ts';
import type { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';

export const OrderRefundMapper = {
	toResponse(transaction: PaymentTransaction, refund: PaymentRefund): ProcessOrderRefundOutput {
		return {
			refundId: refund.razorpayRefundId,
			transactionId: transaction.id,
			orderId: transaction.orderId ?? '',
			amountPaise: refund.amountPaise,
			currency: refund.currency,
			status: refund.status,
			processedAt: refund.processedAt ? refund.processedAt.toISOString() : null,
		};
	},
};
