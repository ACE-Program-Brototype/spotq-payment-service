export type SubscriberSortField =
	| 'createdAt'
	| 'currentPeriodEnd'
	| 'currentPeriodStart'
	| 'status';

export type SortOrder = 'asc' | 'desc';

export interface SubscriberFilterParams {
	page: number;
	limit: number;
	status?: string | null;
	search?: string | null;
	sortBy?: SubscriberSortField;
	sortOrder?: SortOrder;
}

export interface SubscriberPlanSummary {
	id: string;
	code: string;
	name: string;
	description?: string | null;
	pricePaise: number;
	currency: string;
	billingCycle: string;
	features?: unknown;
	isActive: boolean;
}

export interface SubscriberSummary {
	id: string;
	restaurantId: string;
	planId: string;
	status: string;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	canceledAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
	plan: SubscriberPlanSummary;
}

export interface SubscriberTransactionSummary {
	id: string;
	amountPaise: number;
	currency: string;
	status: string;
	razorpayOrderId?: string | null;
	razorpayPaymentId?: string | null;
	createdAt: Date;
}

export interface SubscriberInvoiceSummary {
	id: string;
	invoiceNumber: string;
	amountPaise: number;
	currency: string;
	status: string;
	paidAt?: Date | null;
	createdAt: Date;
}

export interface SubscriberDetail extends SubscriberSummary {
	transactions: SubscriberTransactionSummary[];
	invoices: SubscriberInvoiceSummary[];
}

export interface PaginationResult {
	page: number;
	limit: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface PaginatedSubscribersResult {
	subscribers: SubscriberSummary[];
	pagination: PaginationResult;
}
