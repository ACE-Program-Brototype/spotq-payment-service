import { buildOrderInvoiceS3Key } from '../src/shared/utils/invoice-s3-key.util.ts';

describe('Invoice S3 Key Utility', () => {
	it('should construct correct S3 key with string date', () => {
		const orderId = 'order-123';
		const invoiceNumber = 'INV-20261104-ABC';
		const dateStr = '2026-11-04T19:44:10.429Z';

		const key = buildOrderInvoiceS3Key(orderId, invoiceNumber, dateStr);
		expect(key).toBe('spotq-order-invoices/order-123/2026/11/INV-20261104-ABC.pdf');
	});

	it('should construct correct S3 key with Date object', () => {
		const orderId = 'order-456';
		const invoiceNumber = 'INV-20260515-XYZ';
		const date = new Date(Date.UTC(2026, 4, 15));

		const key = buildOrderInvoiceS3Key(orderId, invoiceNumber, date);
		expect(key).toBe('spotq-order-invoices/order-456/2026/05/INV-20260515-XYZ.pdf');
	});

	it('should fallback to current date when dateInput is not provided', () => {
		const orderId = 'order-789';
		const invoiceNumber = 'INV-CURR-001';

		const key = buildOrderInvoiceS3Key(orderId, invoiceNumber);
		const currentYear = new Date().getUTCFullYear();
		const currentMonth = String(new Date().getUTCMonth() + 1).padStart(2, '0');

		expect(key).toBe(
			`spotq-order-invoices/order-789/${currentYear}/${currentMonth}/INV-CURR-001.pdf`,
		);
	});
});
