import type {
	VerifyOrderPaymentInput,
	VerifyOrderPaymentOutput,
} from '@application/dtos/verify-order-payment.dto.ts';

export interface IVerifyOrderPaymentUseCase {
	execute(input: VerifyOrderPaymentInput): Promise<VerifyOrderPaymentOutput>;
}
