import type { GetCustomerPaymentHistoryOutputDTO } from '@application/dtos/customer-payment/get-customer-payment-history.dto.ts';
import type { PaginatedCustomerTransactionsResult } from '@domain/types/transaction-query.types.ts';

export const CustomerPaymentHistoryMapper = {
	toDTO(result: PaginatedCustomerTransactionsResult): GetCustomerPaymentHistoryOutputDTO {
		return {
			transactions: result.transactions.map((tx) => ({
				transactionId: tx.transactionId,
				orderId: tx.orderId,
				restaurantId: tx.restaurantId,
				amountPaise: tx.amountPaise,
				amountInRupees: tx.amountInRupees,
				currency: tx.currency,
				paymentMethod: tx.paymentMethod,
				status: tx.status,
				failureReason: tx.failureReason,
				razorpayPaymentId: tx.razorpayPaymentId,
				razorpayOrderId: tx.razorpayOrderId,
				createdAt: tx.createdAt instanceof Date ? tx.createdAt.toISOString() : tx.createdAt,
				hasInvoice: tx.hasInvoice,
				invoiceUrl: tx.invoiceUrl,
				retryEligible: tx.retryEligible,
				retryExpiresAt: tx.retryExpiresAt,
				refundDetails: tx.refundDetails,
			})),
			pagination: result.pagination,
		};
	},
};
