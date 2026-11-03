import type { PaymentStatus } from '@domain/entities/payment-transaction.entity.ts';

export interface GetOrderPaymentStatusInput {
	orderId: string;
	customerId?: string;
}

export interface GetOrderPaymentStatusOutput {
	orderId: string;
	paymentId: string;
	gatewayPaymentId: string | null;
	razorpayOrderId: string;
	amountPaise: number;
	currency: string;
	status: PaymentStatus;
	method: string | null;
	createdAt: string;
}
