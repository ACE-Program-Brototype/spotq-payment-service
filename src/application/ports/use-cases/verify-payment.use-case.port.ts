import type {
	VerifyPaymentInput,
	VerifyPaymentOutput,
} from '@application/dtos/verify-payment.dto.ts';

export interface IVerifyPaymentUseCase {
	execute(input: VerifyPaymentInput): Promise<VerifyPaymentOutput>;
}
