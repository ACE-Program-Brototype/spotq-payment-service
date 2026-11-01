import type {
	GetOrderPaymentStatusInput,
	GetOrderPaymentStatusOutput,
} from '@application/dtos/get-order-payment-status.dto.ts';
import { OrderPaymentMapper } from '@application/mappers/index.ts';
import type { IGetOrderPaymentStatusUseCase } from '@application/ports/use-cases/get-order-payment-status.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { OrderPaymentNotFoundError } from '@domain/errors/payment.errors.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetOrderPaymentStatusUseCase implements IGetOrderPaymentStatusUseCase {
	constructor(
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
	) {}

	async execute(input: GetOrderPaymentStatusInput): Promise<GetOrderPaymentStatusOutput> {
		const tx = await this.paymentTransactionRepository.findByCustomerOrderId(input.orderId);

		if (!tx) {
			throw new OrderPaymentNotFoundError();
		}

		tx.assertOwnership(input.customerId);

		return OrderPaymentMapper.toStatusResponse(tx);
	}
}
