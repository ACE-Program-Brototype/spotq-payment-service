import type {
	GetTransactionDetailInputDTO,
	GetTransactionDetailOutputDTO,
} from '@application/dtos/transactions/get-transaction-detail.dto.ts';
import type { IGetTransactionDetailUseCase } from '@application/ports/use-cases/transactions/get-transaction-detail.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { TransactionNotFoundError } from '@domain/errors/transaction.errors.ts';
import type { ITransactionQueryRepository } from '@domain/repositories/transaction-query.repository.interface.ts';
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
				refund: detail.refund
					? {
							id: detail.refund.id,
							razorpayRefundId: detail.refund.razorpayRefundId,
							amountPaise: detail.refund.amountPaise,
							amountFormatted: detail.refund.amountFormatted,
							currency: detail.refund.currency,
							status: detail.refund.status,
							reason: detail.refund.reason,
							processedAt: detail.refund.processedAt
								? detail.refund.processedAt.toISOString()
								: null,
							createdAt: detail.refund.createdAt.toISOString(),
						}
					: null,
				createdAt: detail.createdAt.toISOString(),
				updatedAt: detail.updatedAt.toISOString(),
			},
		};
	}
}
