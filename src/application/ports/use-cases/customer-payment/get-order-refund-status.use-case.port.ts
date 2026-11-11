import type {
	GetOrderRefundStatusInputDTO,
	GetOrderRefundStatusOutputDTO,
} from '@application/dtos/customer-payment/get-order-refund-status.dto.ts';

export interface IGetOrderRefundStatusUseCase {
	execute(input: GetOrderRefundStatusInputDTO): Promise<GetOrderRefundStatusOutputDTO>;
}
