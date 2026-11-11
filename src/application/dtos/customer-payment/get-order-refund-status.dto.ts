export interface GetOrderRefundStatusInputDTO {
	orderId: string;
	customerId: string;
}

export interface GetOrderRefundStatusOutputDTO {
	orderId: string;
	paymentId: string;
	refundId: string;
	gatewayPaymentId: string | null;
	amountPaise: number;
	currency: string;
	status: string;
	reason: string | null;
	paymentMethod: string | null;
	destination: string | null;
	timeline: {
		initiatedAt: string;
		gatewayProcessedAt: string | null;
	};
	supportReference: {
		arn: string | null;
	};
}
