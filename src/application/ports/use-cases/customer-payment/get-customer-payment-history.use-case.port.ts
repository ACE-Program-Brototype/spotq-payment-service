import type {
	GetCustomerPaymentHistoryInputDTO,
	GetCustomerPaymentHistoryOutputDTO,
} from '@application/dtos/customer-payment/get-customer-payment-history.dto.ts';

export interface IGetCustomerPaymentHistoryUseCase {
	execute(input: GetCustomerPaymentHistoryInputDTO): Promise<GetCustomerPaymentHistoryOutputDTO>;
}
