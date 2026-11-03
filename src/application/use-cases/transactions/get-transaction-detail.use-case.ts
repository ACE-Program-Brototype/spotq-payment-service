import type {
	GetTransactionDetailInputDTO,
	GetTransactionDetailOutputDTO,
} from '@application/dtos/transactions/get-transaction-detail.dto.ts';
import { GetTransactionDetailMapper } from '@application/mappers/transactions/get-transaction-detail.mapper.ts';
import type { IGetTransactionDetailUseCase } from '@application/ports/use-cases/transactions/get-transaction-detail.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { TransactionNotFoundError } from '@domain/errors/transaction.errors.ts';
import type { ITransactionQueryRepository } from '@domain/repositories/i-transaction-query.repository.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetTransactionDetailUseCase implements IGetTransactionDetailUseCase {
	constructor(
		@inject(TYPES.Repositories.TransactionQueryRepository)
		private readonly transactionQueryRepository: ITransactionQueryRepository,
	) {}

	async execute(input: GetTransactionDetailInputDTO): Promise<GetTransactionDetailOutputDTO> {
		const detail = await this.transactionQueryRepository.findTransactionById(
			input.transactionId,
			input.restaurantId,
		);

		if (!detail) {
			throw new TransactionNotFoundError();
		}

		return GetTransactionDetailMapper.toDTO(detail);
	}
}
