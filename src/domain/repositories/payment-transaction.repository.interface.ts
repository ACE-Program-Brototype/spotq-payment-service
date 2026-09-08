import type { PaymentTransaction } from '../entities/payment-transaction.entity.ts';

export type PaymentStatus = 'CREATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface CreatePaymentTransactionInput {
	restaurantId: string;
	planId: string;
	razorpayOrderId: string;
	amountPaise: number;
	currency: string;
	status?: PaymentStatus;
	metadata?: Record<string, unknown>;
}

export interface IPaymentTransactionRepository {
	findByOrderId(razorpayOrderId: string): Promise<PaymentTransaction | null>;
	findByPaymentId(razorpayPaymentId: string): Promise<PaymentTransaction | null>;
	findPendingByRestaurantAndPlan(
		restaurantId: string,
		planId: string,
	): Promise<PaymentTransaction | null>;
	create(data: CreatePaymentTransactionInput): Promise<PaymentTransaction>;
	markSuccess(params: {
		razorpayOrderId: string;
		razorpayPaymentId: string;
		razorpaySignature: string;
		subscriptionId: string;
	}): Promise<PaymentTransaction>;
	markFailed(razorpayOrderId: string, failureReason: string): Promise<PaymentTransaction>;
}
