export interface GetTransactionDetailInputDTO {
	restaurantId: string;
	transactionId: string;
}

export interface CustomerDetailDTO {
	name: string | null;
	phoneMasked: string | null;
	tableNumber: string | null;
	tokenNumber: string | null;
}

export interface BillingBreakdownDTO {
	subtotalPaise: number;
	gstPaise: number;
	discountPaise: number;
	grandTotalPaise: number;
}

export interface SettlementInfoDTO {
	status: string;
	settlementId: string | null;
	scheduledPayout: string | null;
}

export interface RefundInfoDTO {
	id: string;
	razorpayRefundId: string;
	amountPaise: number;
	amountFormatted: string;
	currency: string;
	status: string;
	reason: string | null;
	processedAt: string | null;
	createdAt: string;
}

export interface TransactionDetailDTO {
	id: string;
	restaurantId: string;
	orderId: string | null;
	orderNumber: string | null;
	customer: CustomerDetailDTO;
	amountPaise: number;
	amountFormatted: string;
	currency: string;
	status: string;
	paymentMethod: string;
	upiVpa: string | null;
	card: Record<string, unknown> | null;
	razorpayPaymentId: string | null;
	razorpayOrderId: string;
	bankReference: string | null;
	billingBreakdown: BillingBreakdownDTO;
	settlement: SettlementInfoDTO;
	refund: RefundInfoDTO | null;
	createdAt: string;
	updatedAt: string;
}

export interface GetTransactionDetailOutputDTO {
	transaction: TransactionDetailDTO;
}
