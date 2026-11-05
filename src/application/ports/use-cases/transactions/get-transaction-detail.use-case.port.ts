import type {
	GetTransactionDetailInputDTO,
	GetTransactionDetailOutputDTO,
} from '@application/dtos/transactions/get-transaction-detail.dto.ts';

export interface IGetTransactionDetailUseCase {
	execute(input: GetTransactionDetailInputDTO): Promise<GetTransactionDetailOutputDTO>;
}
