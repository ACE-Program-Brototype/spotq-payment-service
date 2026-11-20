export interface RetryCustomerPaymentInputDTO {
	transactionId: string;
	customerId: string;
}

export interface RetryCustomerPaymentOutputDTO {
	transactionId: string;
	orderId: string | null;
	razorpayOrderId: string;
	amountPaise: number;
	amountInRupees: number;
	currency: string;
	keyId: string;
}
