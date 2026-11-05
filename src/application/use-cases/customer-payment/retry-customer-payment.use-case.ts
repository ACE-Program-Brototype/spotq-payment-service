import type {
	RetryCustomerPaymentInputDTO,
	RetryCustomerPaymentOutputDTO,
} from '@application/dtos/customer-payment/retry-customer-payment.dto.ts';
import { CustomerPaymentRetryMapper } from '@application/mappers/customer-payment/customer-payment-retry.mapper.ts';
import type { IRetryCustomerPaymentUseCase } from '@application/ports/use-cases/customer-payment/retry-customer-payment.use-case.port.ts';
import { config } from '@config/index.ts';
import { TYPES } from '@di/types.ts';
import {
	AlreadyPaidError,
	OrderExpiredError,
	TransactionNotFoundError,
} from '@domain/errors/payment.errors.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { PENDING_ORDER_REUSE_WINDOW_MS } from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class RetryCustomerPaymentUseCase implements IRetryCustomerPaymentUseCase {
	constructor(
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
	) {}

	async execute(input: RetryCustomerPaymentInputDTO): Promise<RetryCustomerPaymentOutputDTO> {
		const tx = await this.paymentTransactionRepository.findById(input.transactionId);

		if (!tx) {
			throw new TransactionNotFoundError();
		}

		tx.assertOwnership(input.customerId);

		tx.resetToCreated();

		if (tx.orderId) {
			const capturedSibling = await this.paymentTransactionRepository.findCapturedByOrderId(
				tx.orderId,
			);
			if (capturedSibling) {
				throw new AlreadyPaidError();
			}
		}

		const now = Date.now();
		const createdAtMs = tx.createdAt ? tx.createdAt.getTime() : 0;
		if (now - createdAtMs > PENDING_ORDER_REUSE_WINDOW_MS) {
			throw new OrderExpiredError();
		}

		const updatedTx = await this.paymentTransactionRepository.resetToCreated(tx);

		logger.info(
			{
				transactionId: tx.id,
				orderId: tx.orderId,
				razorpayOrderId: tx.razorpayOrderId,
			},
			'Failed payment transaction reset to CREATED for in-place retry',
		);

		return CustomerPaymentRetryMapper.toDTO(updatedTx, config.razorpay.keyId);
	}
}
