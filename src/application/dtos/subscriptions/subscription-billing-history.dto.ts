import type { PaymentStatus } from '@shared/constants/subscription.constants.ts';

export interface GetSubscriptionBillingHistoryQueryDTO {
	restaurantId: string;
	page?: number;
	limit?: number;
	status?: PaymentStatus;
}

export interface SubscriptionBillingTransactionItemDTO {
	id: string;
	planCode: string;
	planName: string;
	billingCycle: string;
	amountPaise: number;
	amountRupees: number;
	currency: string;
	status: string;
	razorpayPaymentId: string | null;
	invoiceNumber: string | null;
	invoiceUrl: string | null;
	createdAt: string;
}

export interface SubscriptionBillingHistoryPaginationDTO {
	currentPage: number;
	pageSize: number;
	totalRecords: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface SubscriptionBillingHistoryResponseDTO {
	transactions: SubscriptionBillingTransactionItemDTO[];
	pagination: SubscriptionBillingHistoryPaginationDTO;
}
