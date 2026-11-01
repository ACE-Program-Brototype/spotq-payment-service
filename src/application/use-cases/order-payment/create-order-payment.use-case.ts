import type {
	CreateOrderPaymentInput,
	CreateOrderPaymentOutput,
} from '@application/dtos/create-order-payment.dto.ts';
import { OrderPaymentMapper } from '@application/mappers/index.ts';
import type { ICreateOrderPaymentUseCase } from '@application/ports/use-cases/create-order-payment.use-case.port.ts';
import { config } from '@config/index.ts';
import { TYPES } from '@di/types.ts';
import { OrderPaymentAlreadyCapturedError } from '@domain/errors/payment.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import { ReceiptId } from '@domain/value-objects/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { DEFAULT_CURRENCY, PAYMENT_STATUS } from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class CreateOrderPaymentUseCase implements ICreateOrderPaymentUseCase {
	constructor(
		@inject(TYPES.Gateways.PaymentGateway)
		private readonly paymentGateway: IPaymentGateway,
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
	) {}

	async execute(input: CreateOrderPaymentInput): Promise<CreateOrderPaymentOutput> {
		const existingTx = await this.paymentTransactionRepository.findByCustomerOrderId(input.orderId);

		if (existingTx) {
			if (
				existingTx.status === PAYMENT_STATUS.CAPTURED ||
				existingTx.status === PAYMENT_STATUS.SUCCESS
			) {
				logger.warn(
					{ orderId: input.orderId, paymentId: existingTx.id },
					'Attempted to create payment for already captured food order',
				);
				throw new OrderPaymentAlreadyCapturedError();
			}

			if (existingTx.status === PAYMENT_STATUS.CREATED) {
				logger.info(
					{ orderId: input.orderId, razorpayOrderId: existingTx.razorpayOrderId },
					'Reusing existing pending payment transaction for food order',
				);
				return OrderPaymentMapper.toCreateResponse(existingTx, config.razorpay.keyId);
			}
		}

		const currency = input.currency || DEFAULT_CURRENCY;

		const receiptId = ReceiptId.forOrder(input.orderId);
		const gatewayOrder = await this.paymentGateway.createOrder({
			amountInPaise: input.amountPaise,
			currency,
			receiptId,
			notes: {
				orderId: input.orderId,
				customerId: input.customerId,
				restaurantId: input.restaurantId,
			},
		});

		const transaction = await this.paymentTransactionRepository.create({
			restaurantId: input.restaurantId,
			orderId: input.orderId,
			customerId: input.customerId,
			razorpayOrderId: gatewayOrder.orderId,
			amountPaise: input.amountPaise,
			currency,
			status: PAYMENT_STATUS.CREATED,
			metadata: {
				orderId: input.orderId,
				customerId: input.customerId,
				restaurantId: input.restaurantId,
			},
		});

		return OrderPaymentMapper.toCreateResponse(transaction, config.razorpay.keyId);
	}
}
