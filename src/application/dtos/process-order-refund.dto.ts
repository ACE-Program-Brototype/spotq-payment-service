export interface ProcessOrderRefundInput {
	orderId: string;
	amountPaise?: number;
	reason?: string;
	notes?: string;
}

export interface ProcessOrderRefundOutput {
	refundId: string;
	transactionId: string;
	orderId: string;
	amountPaise: number;
	currency: string;
	status: string;
	processedAt: string;
}
