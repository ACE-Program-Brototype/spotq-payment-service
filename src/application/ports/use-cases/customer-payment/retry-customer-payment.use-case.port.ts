import type {
	RetryCustomerPaymentInputDTO,
	RetryCustomerPaymentOutputDTO,
} from '@application/dtos/customer-payment/retry-customer-payment.dto.ts';

export interface IRetryCustomerPaymentUseCase {
	execute(input: RetryCustomerPaymentInputDTO): Promise<RetryCustomerPaymentOutputDTO>;
}
