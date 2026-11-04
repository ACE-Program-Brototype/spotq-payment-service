import type {
	ProcessOrderRefundInput,
	ProcessOrderRefundOutput,
} from '@application/dtos/process-order-refund.dto.ts';
import { OrderRefundMapper } from '@application/mappers/index.ts';
import type { IProcessOrderRefundUseCase } from '@application/ports/use-cases/process-order-refund.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { PaymentGatewayError, PaymentOrderNotFoundError } from '@domain/errors/payment.errors.ts';
import type {
	IPaymentGateway,
	PaymentRefundResult,
} from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { REFUND_STATUS } from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class ProcessOrderRefundUseCase implements IProcessOrderRefundUseCase {
	constructor(
		@inject(TYPES.Gateways.PaymentGateway)
		private readonly paymentGateway: IPaymentGateway,
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
	) {}

	async execute(input: ProcessOrderRefundInput): Promise<ProcessOrderRefundOutput> {
		const tx = await this.paymentTransactionRepository.findByCustomerOrderId(input.orderId);
		if (!tx) {
			throw new PaymentOrderNotFoundError();
		}

		tx.assertCanRefund(input.amountPaise);

		const refundAmountPaise = tx.amountPaise;
		const gatewayPaymentId = tx.razorpayPaymentId as string;

		let gatewayRefund: PaymentRefundResult;
		try {
			gatewayRefund = await this.paymentGateway.createRefund({
				paymentId: gatewayPaymentId,
				amountInPaise: refundAmountPaise,
				notes: {
					orderId: tx.orderId ?? input.orderId,
					transactionId: tx.id,
					...(input.reason ? { reason: input.reason } : {}),
					...(input.notes ? { notes: input.notes } : {}),
				},
			});
		} catch (err) {
			logger.error(
				{ err, orderId: input.orderId, transactionId: tx.id },
				'Payment gateway refund request failed',
			);
			throw new PaymentGatewayError();
		}

		const { transaction: updatedTx, refund } =
			await this.paymentTransactionRepository.processOrderRefund({
				transactionId: tx.id,
				refund: {
					razorpayRefundId: gatewayRefund.refundId,
					amountPaise: refundAmountPaise,
					currency: tx.currency,
					status: REFUND_STATUS.PROCESSED,
					reason: input.reason ?? null,
					arn: gatewayRefund.arn ?? null,
					paymentMethod: tx.paymentMethod,
				},
			});

		return OrderRefundMapper.toResponse(updatedTx, refund);
	}
}
