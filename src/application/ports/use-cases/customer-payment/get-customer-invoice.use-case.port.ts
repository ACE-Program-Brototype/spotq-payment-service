import type {
	GetCustomerInvoiceInputDTO,
	GetCustomerInvoiceOutputDTO,
} from '@application/dtos/customer-payment/get-customer-invoice.dto.ts';

export interface IGetCustomerInvoiceUseCase {
	execute(input: GetCustomerInvoiceInputDTO): Promise<GetCustomerInvoiceOutputDTO>;
}
