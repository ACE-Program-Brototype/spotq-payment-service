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

export interface IPaymentGateway {
	initialize(): Promise<void>;
	isHealthy(): boolean;
	createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
	verifyPaymentSignature(params: VerifyPaymentSignatureParams): boolean;
	getPaymentDetails(paymentId: string): Promise<unknown>;
}
