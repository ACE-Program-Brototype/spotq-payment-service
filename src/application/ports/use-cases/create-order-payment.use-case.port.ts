import type {
	CreateOrderPaymentInput,
	CreateOrderPaymentOutput,
} from '@application/dtos/create-order-payment.dto.ts';

export interface ICreateOrderPaymentUseCase {
	execute(input: CreateOrderPaymentInput): Promise<CreateOrderPaymentOutput>;
}
