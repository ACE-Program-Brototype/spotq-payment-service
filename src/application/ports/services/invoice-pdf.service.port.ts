import type { OrderInvoiceDataDTO } from '@application/dtos/order-payment-invoice-event.dto.ts';

export interface IInvoicePdfService {
	generateInvoicePdf(orderData: OrderInvoiceDataDTO): Promise<Buffer>;
}
