export interface CreateOrderParams {
	amountInPaise: number;
	currency: string;
	receiptId: string;
	notes?: Record<string, string>;
}

export interface PaymentOrderResult {
	orderId: string;
	amount: number;
	currency: string;
	status: string;
	receipt?: string;
}

export interface VerifyPaymentSignatureParams {
	orderId: string;
	paymentId: string;
	signature: string;
}

export interface PaymentDetailsResult {
	id: string;
	entity: string;
	amount: number;
	currency: string;
	status: string;
	order_id: string;
	method?: string;
	description?: string;
	email?: string;
	contact?: string;
	notes?: Record<string, string>;
	created_at: number;
	[key: string]: unknown;
}

export interface IPaymentGateway {
	initialize(): Promise<void>;
	isHealthy(): boolean;
	createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
	verifyPaymentSignature(params: VerifyPaymentSignatureParams): boolean;
	verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean;
	getPaymentDetails(paymentId: string): Promise<PaymentDetailsResult>;
}
