import type { PaymentSortField, SortDirection } from '@shared/constants/index.ts';

export interface GetCustomerPaymentHistoryInputDTO {
	customerId: string;
	page?: number;
	limit?: number;
	status?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	sortBy?: PaymentSortField;
	sortOrder?: SortDirection;
}

export interface CustomerPaymentRefundDTO {
	refundId: string;
	razorpayRefundId: string;
	amountPaise: number;
	amountInRupees: number;
	status: string;
	reason: string | null;
	arn: string | null;
	processedAt: string | null;
}

export interface CustomerPaymentTransactionDTO {
	transactionId: string;
	orderId: string | null;
	restaurantId: string;
	amountPaise: number;
	amountInRupees: number;
	currency: string;
	paymentMethod: string;
	status: string;
	failureReason: string | null;
	razorpayPaymentId: string | null;
	razorpayOrderId: string;
	createdAt: string;
	hasInvoice: boolean;
	invoiceUrl: string | null;
	retryEligible: boolean;
	retryExpiresAt: string | null;
	refundDetails: CustomerPaymentRefundDTO | null;
}

export interface CustomerPaymentPaginationDTO {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface GetCustomerPaymentHistoryOutputDTO {
	transactions: CustomerPaymentTransactionDTO[];
	pagination: CustomerPaymentPaginationDTO;
}
