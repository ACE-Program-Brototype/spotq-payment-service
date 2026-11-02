import type { PaymentStatus, PaymentTransaction } from '../entities/payment-transaction.entity.ts';

export interface CreatePaymentTransactionInput {
	restaurantId: string;
	planId?: string | null;
	orderId?: string | null;
	customerId?: string | null;
	razorpayOrderId: string;
	amountPaise: number;
	currency: string;
	status?: PaymentStatus;
	metadata?: Record<string, unknown>;
}

export interface CaptureOrderPaymentWithOutboxParams {
	transaction: PaymentTransaction;
	outbox: {
		eventType: string;
		aggregateId: string;
		payload: Record<string, unknown>;
	};
}

export interface FailOrderPaymentWithOutboxParams {
	transaction: PaymentTransaction;
	outbox: {
		eventType: string;
		aggregateId: string;
		payload: Record<string, unknown>;
	};
}

export interface IPaymentTransactionRepository {
	findByOrderId(razorpayOrderId: string): Promise<PaymentTransaction | null>;
	findByCustomerOrderId(orderId: string): Promise<PaymentTransaction | null>;
	findByPaymentId(razorpayPaymentId: string): Promise<PaymentTransaction | null>;
	findPendingByRestaurantAndPlan(
		restaurantId: string,
		planId: string,
	): Promise<PaymentTransaction | null>;
	create(data: CreatePaymentTransactionInput): Promise<PaymentTransaction>;
	captureOrderPaymentWithOutbox(
		params: CaptureOrderPaymentWithOutboxParams,
	): Promise<PaymentTransaction>;
	failOrderPaymentWithOutbox(params: FailOrderPaymentWithOutboxParams): Promise<PaymentTransaction>;
	markSuccess(params: {
		razorpayOrderId: string;
		razorpayPaymentId: string;
		razorpaySignature: string;
		subscriptionId: string;
	}): Promise<PaymentTransaction>;
	markFailed(razorpayOrderId: string, failureReason: string): Promise<PaymentTransaction>;
	resetToCreated(razorpayOrderId: string): Promise<PaymentTransaction>;
}
