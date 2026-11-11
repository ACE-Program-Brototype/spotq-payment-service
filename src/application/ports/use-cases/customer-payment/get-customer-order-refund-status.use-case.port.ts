import type {
	GetCustomerOrderRefundStatusInputDTO,
	GetCustomerOrderRefundStatusOutputDTO,
} from '@application/dtos/customer-payment/get-customer-order-refund-status.dto.ts';

export interface IGetOrderRefundStatusUseCase {
	execute(
		input: GetCustomerOrderRefundStatusInputDTO,
	): Promise<GetCustomerOrderRefundStatusOutputDTO>;
}
