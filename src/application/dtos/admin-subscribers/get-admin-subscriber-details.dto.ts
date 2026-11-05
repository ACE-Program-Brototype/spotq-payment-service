import type { AdminSubscriberPlanDTO } from './list-admin-subscribers.dto.ts';

export interface GetAdminSubscriberDetailsInputDTO {
	subscriberId: string;
}

export interface AdminSubscriberTransactionDTO {
	id: string;
	transactionId: string;
	amountPaise: number;
	currency: string;
	status: string;
	razorpayOrderId?: string | null;
	razorpayPaymentId?: string | null;
	createdAt: string;
}

export interface AdminSubscriberInvoiceDTO {
	id: string;
	invoiceId: string;
	invoiceNumber: string;
	amountPaise: number;
	currency: string;
	status: string;
	paidAt?: string | null;
	createdAt: string;
}

export interface AdminSubscriberDetailsOutputDTO {
	id: string;
	subscriberId: string;
	restaurantId: string;
	restaurantName?: string | null;
	subscriberName?: string | null;
	subscriberEmail?: string | null;
	restaurantStatus?: string | null;
	isRestaurantBlocked?: boolean;
	planId: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	canceledAt: string | null;
	createdAt: string;
	updatedAt: string;
	plan: AdminSubscriberPlanDTO;
	transactions: AdminSubscriberTransactionDTO[];
	invoices: AdminSubscriberInvoiceDTO[];
}
