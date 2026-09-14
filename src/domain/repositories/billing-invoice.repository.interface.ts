import type { BillingInvoice } from '../entities/billing-invoice.entity.ts';
import type { IBaseRepository } from './base.repository.interface.ts';

export interface CreateBillingInvoiceInput {
	restaurantId: string;
	subscriptionId?: string | null;
	paymentTransactionId?: string | null;
	invoiceNumber: string;
	amountPaise: number;
	currency?: string;
	status?: 'DRAFT' | 'PAID' | 'VOID';
}

export interface UpdateBillingInvoiceInput {
	subscriptionId?: string | null;
	paymentTransactionId?: string | null;
	status?: 'DRAFT' | 'PAID' | 'VOID';
	paidAt?: Date | null;
}

export interface IBillingInvoiceRepository
	extends IBaseRepository<BillingInvoice, CreateBillingInvoiceInput, UpdateBillingInvoiceInput> {
	create(data: CreateBillingInvoiceInput): Promise<BillingInvoice>;
	update(id: string, data: UpdateBillingInvoiceInput): Promise<BillingInvoice | null>;
	findByInvoiceNumber(invoiceNumber: string): Promise<BillingInvoice | null>;
	findByPaymentTransactionId(paymentTransactionId: string): Promise<BillingInvoice | null>;
	findByRestaurantId(restaurantId: string): Promise<BillingInvoice[]>;
}
