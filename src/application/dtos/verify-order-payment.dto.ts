import type { PaymentStatus } from '@domain/entities/payment-transaction.entity.ts';

export interface VerifyOrderPaymentInput {
	orderId: string;
	razorpayOrderId: string;
	razorpayPaymentId: string;
	razorpaySignature: string;
	customerId?: string;
}

export interface VerifyOrderPaymentOutput {
	paymentId: string;
	orderId: string;
	gatewayPaymentId: string;
	status: PaymentStatus;
	verifiedAt: string;
}
