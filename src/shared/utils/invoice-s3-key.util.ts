/**
 * Constructs a partitioned S3 key for storing order invoice PDFs.
 * Partitioning format: spotq-order-invoices/{orderId}/{YYYY}/{MM}/{invoiceNumber}.pdf
 */
export function buildOrderInvoiceS3Key(
	orderId: string,
	invoiceNumber: string,
	dateInput?: string | Date,
): string {
	const date = dateInput ? new Date(dateInput) : new Date();
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	return `spotq-order-invoices/${orderId}/${year}/${month}/${invoiceNumber}.pdf`;
}
