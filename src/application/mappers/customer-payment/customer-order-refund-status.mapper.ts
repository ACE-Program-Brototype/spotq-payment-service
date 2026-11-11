import type { GetCustomerOrderRefundStatusOutputDTO } from '@application/dtos/customer-payment/get-customer-order-refund-status.dto.ts';
import type { PaymentRefund } from '@domain/entities/payment-refund.entity.ts';
import type { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';

export const CustomerOrderRefundStatusMapper = {
	toDTO(
		transaction: PaymentTransaction,
		refund: PaymentRefund,
	): GetCustomerOrderRefundStatusOutputDTO {
		return {
			orderId: transaction.orderId ?? '',
			paymentId: transaction.id,
			refundId: refund.razorpayRefundId,
			gatewayPaymentId: transaction.razorpayPaymentId,
			amountPaise: refund.amountPaise,
			currency: refund.currency,
			status: refund.status,
			reason: refund.reason,
			paymentMethod: refund.paymentMethod ?? transaction.paymentMethod,
			destination: refund.destination,
			timeline: {
				initiatedAt: (refund.createdAt ?? new Date()).toISOString(),
				gatewayProcessedAt: refund.processedAt?.toISOString() ?? null,
			},
			supportReference: {
				arn: refund.arn,
			},
		};
	},
};
