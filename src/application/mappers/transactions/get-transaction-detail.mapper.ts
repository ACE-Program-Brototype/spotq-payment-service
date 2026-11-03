import type {
	GetTransactionDetailOutputDTO,
	RefundInfoDTO,
} from '@application/dtos/transactions/get-transaction-detail.dto.ts';
import type { TransactionDetail } from '@domain/types/transaction-query.types.ts';

export const GetTransactionDetailMapper = {
	toDTO(detail: TransactionDetail): GetTransactionDetailOutputDTO {
		let refund: RefundInfoDTO | null = null;
		if (detail.refund) {
			refund = {
				id: detail.refund.id,
				razorpayRefundId: detail.refund.razorpayRefundId,
				amountPaise: detail.refund.amountPaise,
				amountFormatted: detail.refund.amountFormatted,
				currency: detail.refund.currency,
				status: detail.refund.status,
				reason: detail.refund.reason,
				processedAt: detail.refund.processedAt ? detail.refund.processedAt.toISOString() : null,
				createdAt: detail.refund.createdAt.toISOString(),
			};
		}

		return {
			transaction: {
				id: detail.id,
				restaurantId: detail.restaurantId,
				orderId: detail.orderId,
				orderNumber: detail.orderNumber,
				customer: detail.customer,
				amountPaise: detail.amountPaise,
				amountFormatted: detail.amountFormatted,
				currency: detail.currency,
				status: detail.status,
				paymentMethod: detail.paymentMethod,
				upiVpa: detail.upiVpa,
				card: detail.card,
				razorpayPaymentId: detail.razorpayPaymentId,
				razorpayOrderId: detail.razorpayOrderId,
				bankReference: detail.bankReference,
				billingBreakdown: detail.billingBreakdown,
				settlement: detail.settlement,
				refund,
				createdAt: detail.createdAt.toISOString(),
				updatedAt: detail.updatedAt.toISOString(),
			},
		};
	},
};
