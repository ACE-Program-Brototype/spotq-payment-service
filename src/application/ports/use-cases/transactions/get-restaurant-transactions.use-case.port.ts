import type {
	ListTransactionsOutputDTO,
	ListTransactionsQueryDTO,
} from '@application/dtos/transactions/list-transactions.dto.ts';

export interface IGetRestaurantTransactionsUseCase {
	execute(query: ListTransactionsQueryDTO): Promise<ListTransactionsOutputDTO>;
}
