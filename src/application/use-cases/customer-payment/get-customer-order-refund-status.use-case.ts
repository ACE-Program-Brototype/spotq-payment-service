import type {
	GetCustomerOrderRefundStatusInputDTO,
	GetCustomerOrderRefundStatusOutputDTO,
} from '@application/dtos/customer-payment/get-customer-order-refund-status.dto.ts';
import { CustomerOrderRefundStatusMapper } from '@application/mappers/customer-payment/customer-order-refund-status.mapper.ts';
import type { IGetOrderRefundStatusUseCase } from '@application/ports/use-cases/customer-payment/get-customer-order-refund-status.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { CustomerUnauthorizedError } from '@domain/errors/payment.errors.ts';
import {
	OrderNotRefundedError,
	TransactionNotFoundError,
} from '@domain/errors/transaction.errors.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetCustomerOrderRefundStatusUseCase implements IGetOrderRefundStatusUseCase {
	constructor(
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
	) {}

	async execute(
		input: GetCustomerOrderRefundStatusInputDTO,
	): Promise<GetCustomerOrderRefundStatusOutputDTO> {
		const transaction = await this.paymentTransactionRepository.findByCustomerOrderId(
			input.orderId,
		);

		if (!transaction) {
			throw new TransactionNotFoundError();
		}

		if (!transaction.isOwnedBy(input.customerId)) {
			throw new CustomerUnauthorizedError();
		}

		const refund = await this.paymentTransactionRepository.findRefundByPaymentTransactionId(
			transaction.id,
		);

		if (!refund) {
			throw new OrderNotRefundedError();
		}

		return CustomerOrderRefundStatusMapper.toDTO(transaction, refund);
	}
}
