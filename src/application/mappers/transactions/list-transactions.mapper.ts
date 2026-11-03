import type {
	ListTransactionsOutputDTO,
	TransactionSummaryDTO,
} from '@application/dtos/transactions/list-transactions.dto.ts';
import type { PaginatedTransactionsResult } from '@domain/types/transaction-query.types.ts';

export const ListTransactionsMapper = {
	toDTO(result: PaginatedTransactionsResult): ListTransactionsOutputDTO {
		const transactions: TransactionSummaryDTO[] = result.transactions.map((tx) => ({
			id: tx.id,
			orderId: tx.orderId,
			orderNumber: tx.orderNumber,
			customerName: tx.customerName,
			razorpayPaymentId: tx.razorpayPaymentId,
			paymentMethod: tx.paymentMethod,
			amountPaise: tx.amountPaise,
			amountFormatted: tx.amountFormatted,
			status: tx.status,
			settlementStatus: tx.settlementStatus,
			createdAt: tx.createdAt.toISOString(),
		}));

		return {
			transactions,
			pagination: result.pagination,
		};
	},
};
