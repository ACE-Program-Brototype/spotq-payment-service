export interface VerifyPaymentInput {
	razorpayOrderId: string;
	razorpayPaymentId: string;
	razorpaySignature: string;
	restaurantId?: string;
}

export interface VerifyPaymentOutput {
	subscriptionId: string;
	restaurantId: string;
	planCode: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
}
