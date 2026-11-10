import type {
	GetCustomerPaymentHistoryInputDTO,
	GetCustomerPaymentHistoryOutputDTO,
} from '@application/dtos/customer-payment/get-customer-payment-history.dto.ts';
import { CustomerPaymentHistoryMapper } from '@application/mappers/customer-payment/customer-payment-history.mapper.ts';
import type { IGetCustomerPaymentHistoryUseCase } from '@application/ports/use-cases/customer-payment/get-customer-payment-history.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { ForbiddenAccessError, InvalidDateRangeError } from '@domain/errors/transaction.errors.ts';
import type { ITransactionQueryRepository } from '@domain/repositories/transaction-query.repository.interface.ts';
import { PAGINATION, PAYMENT_SORT_FIELDS, SORT_DIRECTIONS } from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetCustomerPaymentHistoryUseCase implements IGetCustomerPaymentHistoryUseCase {
	constructor(
		@inject(TYPES.Repositories.TransactionQueryRepository)
		private readonly transactionQueryRepository: ITransactionQueryRepository,
	) {}

	async execute(
		input: GetCustomerPaymentHistoryInputDTO,
	): Promise<GetCustomerPaymentHistoryOutputDTO> {
		if (!input.customerId?.trim()) {
			throw new ForbiddenAccessError();
		}

		if (input.startDate && input.endDate) {
			const start = new Date(input.startDate);
			const end = new Date(input.endDate);
			if (start.getTime() > end.getTime()) {
				throw new InvalidDateRangeError();
			}
		}

		const result = await this.transactionQueryRepository.findTransactionsByCustomer({
			customerId: input.customerId,
			page: input.page || PAGINATION.DEFAULT_PAGE,
			limit: input.limit || PAGINATION.DEFAULT_LIMIT,
			status: input.status ?? null,
			startDate: input.startDate ?? null,
			endDate: input.endDate ?? null,
			sortBy: input.sortBy || PAYMENT_SORT_FIELDS.CREATED_AT,
			sortOrder: input.sortOrder || SORT_DIRECTIONS.DESC,
		});

		return CustomerPaymentHistoryMapper.toDTO(result);
	}
}
