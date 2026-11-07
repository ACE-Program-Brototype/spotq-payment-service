import type { PaymentRefund, RefundStatus } from '../entities/payment-refund.entity.ts';
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

export interface ProcessOrderRefundParams {
	transaction: PaymentTransaction;
	refund: {
		razorpayRefundId: string;
		amountPaise: number;
		currency: string;
		status: RefundStatus;
		reason?: string | null;
		arn?: string | null;
		paymentMethod?: string | null;
	};
}

export interface ProcessOrderRefundResult {
	transaction: PaymentTransaction;
	refund: PaymentRefund;
}

export interface SyncRefundFromWebhookParams {
	razorpayRefundId: string;
	razorpayPaymentId?: string | null;
	status: RefundStatus;
	amountPaise?: number;
	currency?: string;
	arn?: string | null;
	reason?: string | null;
}

export interface IPaymentTransactionRepository {
	findById(id: string): Promise<PaymentTransaction | null>;
	findByOrderId(razorpayOrderId: string): Promise<PaymentTransaction | null>;
	findByCustomerOrderId(orderId: string): Promise<PaymentTransaction | null>;
	findByPaymentId(razorpayPaymentId: string): Promise<PaymentTransaction | null>;
	findCapturedByOrderId(orderId: string): Promise<PaymentTransaction | null>;
	findPendingByRestaurantAndPlan(
		restaurantId: string,
		planId: string,
	): Promise<PaymentTransaction | null>;
	create(data: CreatePaymentTransactionInput): Promise<PaymentTransaction>;
	captureOrderPaymentWithOutbox(
		params: CaptureOrderPaymentWithOutboxParams,
	): Promise<PaymentTransaction>;
	failOrderPaymentWithOutbox(params: FailOrderPaymentWithOutboxParams): Promise<PaymentTransaction>;
	processOrderRefund(params: ProcessOrderRefundParams): Promise<ProcessOrderRefundResult>;
	syncRefundFromWebhook(params: SyncRefundFromWebhookParams): Promise<void>;
	markSuccess(params: {
		razorpayOrderId: string;
		razorpayPaymentId: string;
		razorpaySignature: string;
		subscriptionId: string;
	}): Promise<PaymentTransaction>;
	markFailed(razorpayOrderId: string, failureReason: string): Promise<PaymentTransaction>;
	resetToCreated(transaction: PaymentTransaction): Promise<PaymentTransaction>;
}
