import type {
	GetOrderPaymentStatusInput,
	GetOrderPaymentStatusOutput,
} from '@application/dtos/get-order-payment-status.dto.ts';

export interface IGetOrderPaymentStatusUseCase {
	execute(input: GetOrderPaymentStatusInput): Promise<GetOrderPaymentStatusOutput>;
}
