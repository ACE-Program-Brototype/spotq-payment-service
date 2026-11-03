import type {
	ListTransactionsOutputDTO,
	ListTransactionsQueryDTO,
} from '@application/dtos/transactions/list-transactions.dto.ts';
import type { IGetRestaurantTransactionsUseCase } from '@application/ports/use-cases/transactions/get-restaurant-transactions.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { InvalidDateRangeError } from '@domain/errors/transaction.errors.ts';
import type { ITransactionQueryRepository } from '@domain/repositories/transaction-query.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetRestaurantTransactionsUseCase implements IGetRestaurantTransactionsUseCase {
	constructor(
		@inject(TYPES.Repositories.TransactionQueryRepository)
		private readonly transactionQueryRepository: ITransactionQueryRepository,
	) {}

	async execute(query: ListTransactionsQueryDTO): Promise<ListTransactionsOutputDTO> {
		if (query.startDate && query.endDate) {
			const start = new Date(query.startDate);
			const end = new Date(query.endDate);
			if (start.getTime() > end.getTime()) {
				throw new InvalidDateRangeError();
			}
		}

		const result = await this.transactionQueryRepository.findTransactionsByRestaurant({
			restaurantId: query.restaurantId,
			page: query.page,
			limit: query.limit,
			search: query.search ?? null,
			status: query.status ?? null,
			method: query.method ?? null,
			startDate: query.startDate ?? null,
			endDate: query.endDate ?? null,
			minAmount: query.minAmount ?? null,
			maxAmount: query.maxAmount ?? null,
			sortBy: query.sortBy,
			sortOrder: query.sortOrder,
		});

		return {
			transactions: result.transactions.map((tx) => ({
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
			})),
			pagination: result.pagination,
		};
	}
}
