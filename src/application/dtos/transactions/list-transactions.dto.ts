export interface ListTransactionsQueryDTO {
	restaurantId: string;
	page: number;
	limit: number;
	search?: string | null;
	status?: string | null;
	method?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	minAmount?: number | null;
	maxAmount?: number | null;
	sortBy?: 'createdAt' | 'amountPaise';
	sortOrder?: 'asc' | 'desc';
}

export interface TransactionSummaryDTO {
	id: string;
	orderId: string | null;
	orderNumber: string | null;
	customerName: string | null;
	razorpayPaymentId: string | null;
	paymentMethod: string;
	amountPaise: number;
	amountFormatted: string;
	status: string;
	settlementStatus: string;
	createdAt: string;
}

export interface PaginationMetadataDTO {
	currentPage: number;
	totalPages: number;
	totalRecords: number;
	limit: number;
}

export interface ListTransactionsOutputDTO {
	transactions: TransactionSummaryDTO[];
	pagination: PaginationMetadataDTO;
}
