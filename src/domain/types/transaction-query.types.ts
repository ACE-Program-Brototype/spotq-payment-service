import type { PaymentStatus } from '@shared/constants/subscription.constants.ts';
import type {
	SortDirection,
	TransactionPaymentMethod,
	TransactionQueryStatus,
	TransactionSortField,
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
	sortBy?: TransactionSortField | 'createdAt' | 'amountPaise';
	sortOrder?: SortDirection | 'asc' | 'desc';
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

export interface SubscriptionBillingHistoryFilterParams {
	restaurantId: string;
	page: number;
	limit: number;
	status?: PaymentStatus;
}

export interface SubscriptionBillingTransactionRecord {
	id: string;
	amountPaise: number;
	currency: string;
	status: string;
	razorpayPaymentId: string | null;
	createdAt: Date;
	plan: {
		code: string;
		name: string;
		billingCycle: string;
	} | null;
	invoice: {
		invoiceNumber: string;
		invoicePdfKey: string | null;
	} | null;
}

export interface PaginatedSubscriptionBillingHistoryResult {
	records: SubscriptionBillingTransactionRecord[];
	totalRecords: number;
}
