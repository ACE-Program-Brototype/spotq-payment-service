import type { OrderInvoiceDataDTO } from '@application/dtos/order-payment-invoice-event.dto.ts';
import type { BillingInvoice } from '@domain/entities/billing-invoice.entity.ts';

export interface IGenerateOrderInvoiceUseCase {
	execute(orderData: OrderInvoiceDataDTO): Promise<BillingInvoice>;
}
