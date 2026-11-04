import type {
	VerifyOrderPaymentInput,
	VerifyOrderPaymentOutput,
} from '@application/dtos/verify-order-payment.dto.ts';
import { OrderPaymentMapper } from '@application/mappers/index.ts';
import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { IVerifyOrderPaymentUseCase } from '@application/ports/use-cases/verify-order-payment.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	InvalidPaymentSignatureError,
	PaymentOrderNotFoundError,
} from '@domain/errors/payment.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { PAYMENT_EVENTS, PAYMENT_STATUS } from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class VerifyOrderPaymentUseCase implements IVerifyOrderPaymentUseCase {
	constructor(
		@inject(TYPES.Gateways.PaymentGateway)
		private readonly paymentGateway: IPaymentGateway,
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
		@inject(TYPES.Services.OutboxRelayService)
		private readonly outboxRelayService: IOutboxRelayService,
	) {}

	async execute(input: VerifyOrderPaymentInput): Promise<VerifyOrderPaymentOutput> {
		const tx = await this.paymentTransactionRepository.findByOrderId(input.razorpayOrderId);

		if (!tx) {
			throw new PaymentOrderNotFoundError();
		}

		tx.assertBelongsToOrder(input.orderId);
		tx.assertOwnership(input.customerId);

		if (tx.status === PAYMENT_STATUS.CAPTURED) {
			logger.info(
				{ orderId: input.orderId, razorpayOrderId: input.razorpayOrderId },
				'Order payment already captured, returning idempotent success',
			);
			return OrderPaymentMapper.toVerifyResponse(tx);
		}

		const isValid = this.paymentGateway.verifyPaymentSignature({
			orderId: input.razorpayOrderId,
			paymentId: input.razorpayPaymentId,
			signature: input.razorpaySignature,
		});

		if (!isValid) {
			throw new InvalidPaymentSignatureError();
		}

		tx.capture({
			paymentId: input.razorpayPaymentId,
			signature: input.razorpaySignature,
		});

		const now = new Date();
		const updatedTx = await this.paymentTransactionRepository.captureOrderPaymentWithOutbox({
			transaction: tx,
			outbox: {
				eventType: PAYMENT_EVENTS.ORDER_CAPTURED,
				aggregateId: input.orderId,
				payload: {
					paymentId: tx.id,
					orderId: input.orderId,
					customerId: tx.customerId,
					restaurantId: tx.restaurantId,
					amountPaise: tx.amountPaise,
					currency: tx.currency,
					gatewayPaymentId: input.razorpayPaymentId,
					timestamp: now.toISOString(),
				},
			},
		});

		this.outboxRelayService.processPendingEvents().catch((err) => {
			logger.error({ err }, 'Background outbox relay dispatch failed after order payment verify');
		});

		return OrderPaymentMapper.toVerifyResponse(updatedTx, now);
	}
}
