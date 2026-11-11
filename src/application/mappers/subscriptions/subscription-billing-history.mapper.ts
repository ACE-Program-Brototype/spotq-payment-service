import type {
	SubscriptionBillingHistoryResponseDTO,
	SubscriptionBillingTransactionItemDTO,
} from '@application/dtos/subscriptions/subscription-billing-history.dto.ts';
import type { SubscriptionBillingTransactionRecord } from '@domain/types/transaction-query.types.ts';

export const SubscriptionBillingHistoryMapper = {
	toTransactionItemDTO(
		record: SubscriptionBillingTransactionRecord,
		invoiceUrl: string | null,
	): SubscriptionBillingTransactionItemDTO {
		return {
			id: record.id,
			planCode: record.plan?.code ?? 'UNKNOWN',
			planName: record.plan?.name ?? 'Subscription Plan',
			billingCycle: record.plan?.billingCycle ?? 'MONTHLY',
			amountPaise: record.amountPaise,
			amountRupees: Number((record.amountPaise / 100).toFixed(2)),
			currency: record.currency,
			status: record.status,
			razorpayPaymentId: record.razorpayPaymentId ?? null,
			invoiceNumber: record.invoice?.invoiceNumber ?? null,
			invoiceUrl,
			createdAt: record.createdAt.toISOString(),
		};
	},

	toResponseDTO(
		transactions: SubscriptionBillingTransactionItemDTO[],
		pagination: {
			currentPage: number;
			pageSize: number;
			totalRecords: number;
		},
	): SubscriptionBillingHistoryResponseDTO {
		const totalPages =
			pagination.totalRecords > 0 ? Math.ceil(pagination.totalRecords / pagination.pageSize) : 0;

		return {
			transactions,
			pagination: {
				currentPage: pagination.currentPage,
				pageSize: pagination.pageSize,
				totalRecords: pagination.totalRecords,
				totalPages,
				hasNextPage: pagination.currentPage < totalPages,
				hasPrevPage: pagination.currentPage > 1,
			},
		};
	},
};
