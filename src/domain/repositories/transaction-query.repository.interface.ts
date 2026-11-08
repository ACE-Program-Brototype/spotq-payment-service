import type {
	PaginatedSubscriptionBillingHistoryResult,
	PaginatedTransactionsResult,
	SubscriptionBillingHistoryFilterParams,
	TransactionDetail,
	TransactionFilterParams,
} from '../types/transaction-query.types.ts';

export interface ITransactionQueryRepository {
	findTransactionsByRestaurant(
		params: TransactionFilterParams,
	): Promise<PaginatedTransactionsResult>;
	findTransactionById(id: string, restaurantId: string): Promise<TransactionDetail | null>;
	findSubscriptionBillingTransactions(
		params: SubscriptionBillingHistoryFilterParams,
	): Promise<PaginatedSubscriptionBillingHistoryResult>;
}
