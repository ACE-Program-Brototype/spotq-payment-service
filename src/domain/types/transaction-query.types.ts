import type { PaymentSortField, SortDirection } from '@shared/constants/index.ts';
import type {
	TransactionPaymentMethod,
	TransactionQueryStatus,
} from '../enums/transaction.enums.ts';

export interface TransactionFilterParams {
	restaurantId: string;
	page: number;
	limit: number;
	search?: string | null;
	status?: TransactionQueryStatus | string | null;
	method?: TransactionPaymentMethod | string | null;
	startDate?: string | null;
	endDate?: string | null;
	minAmount?: number | null;
	maxAmount?: number | null;
	sortBy?: PaymentSortField;
	sortOrder?: SortDirection;
}

export interface TransactionSummary {
	id: string;
	orderId: string | null;
	orderNumber: string | null;
	customerName: string | null;
	razorpayPaymentId: string | null;
	paymentMethod: string;
	amountPaise: number;
	amountFormatted?: string;
	status: string;
	settlementStatus: string;
	createdAt: Date;
}

export interface PaginationMetadata {
	currentPage: number;
	totalPages: number;
	totalRecords: number;
	limit: number;
}

export interface PaginatedTransactionsResult {
	transactions: TransactionSummary[];
	pagination: PaginationMetadata;
}

export interface CustomerContext {
	name: string | null;
	phoneMasked: string | null;
	tableNumber: string | null;
	tokenNumber: string | null;
}

export interface BillingBreakdown {
	subtotalPaise: number;
	gstPaise: number;
	discountPaise: number;
	grandTotalPaise: number;
}

export interface SettlementDetail {
	status: string;
	settlementId: string | null;
	scheduledPayout: string | null;
}

export interface RefundDetail {
	id: string;
	razorpayRefundId: string;
	amountPaise: number;
	amountFormatted?: string;
	currency: string;
	status: string;
	reason: string | null;
	processedAt: Date | null;
	createdAt: Date;
}

export interface TransactionDetail {
	id: string;
	restaurantId: string;
	orderId: string | null;
	orderNumber: string | null;
	customer: CustomerContext;
	amountPaise: number;
	amountFormatted?: string;
	currency: string;
	status: string;
	paymentMethod: string;
	upiVpa: string | null;
	card: Record<string, unknown> | null;
	razorpayPaymentId: string | null;
	razorpayOrderId: string;
	bankReference: string | null;
	billingBreakdown: BillingBreakdown;
	settlement: SettlementDetail;
	refund: RefundDetail | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface CustomerTransactionFilterParams {
	customerId: string;
	page: number;
	limit: number;
	status?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	sortBy?: PaymentSortField;
	sortOrder?: SortDirection;
}

export interface CustomerRefundSummary {
	refundId: string;
	razorpayRefundId: string;
	amountPaise: number;
	amountInRupees: number;
	status: string;
	reason: string | null;
	arn: string | null;
	processedAt: string | null;
}

export interface CustomerTransactionRecord {
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
	createdAt: Date;
	hasInvoice: boolean;
	invoiceUrl: string | null;
	retryEligible: boolean;
	retryExpiresAt: string | null;
	refundDetails: CustomerRefundSummary | null;
}

export interface CustomerPaginationMetadata {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface PaginatedCustomerTransactionsResult {
	transactions: CustomerTransactionRecord[];
	pagination: CustomerPaginationMetadata;
}
