export interface CreateOrderPaymentInput {
	orderId: string;
	customerId: string;
	restaurantId: string;
	amountPaise: number;
	currency?: string;
}

export interface CreateOrderPaymentOutput {
	paymentId: string;
	orderId: string;
	razorpayOrderId: string;
	gatewayOrderId: string;
	amountPaise: number;
	currency: string;
	keyId: string;
}
