export interface GetCustomerInvoiceInputDTO {
	transactionId: string;
	customerId: string;
}

export interface GetCustomerInvoiceOutputDTO {
	downloadUrl: string;
	expiresInSeconds: number;
	invoiceNumber: string;
}
