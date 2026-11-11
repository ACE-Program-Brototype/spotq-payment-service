import { BillingInvoice } from '@domain/entities/billing-invoice.entity.ts';
import type {
	CreateBillingInvoiceInput,
	UpdateBillingInvoiceInput,
} from '@domain/repositories/billing-invoice.repository.interface.ts';
import type { Prisma, BillingInvoice as PrismaBillingInvoice } from '@prisma/client';
import { DEFAULT_CURRENCY, INVOICE_STATUS } from '@shared/constants/index.ts';

/**
 * Persistence mapper converting BillingInvoice domain entities and inputs to and from Prisma records.
 */
export const BillingInvoicePersistenceMapper = {
	toDomain(record: PrismaBillingInvoice): BillingInvoice {
		return new BillingInvoice({
			id: record.id,
			restaurantId: record.restaurantId,
			subscriptionId: record.subscriptionId,
			paymentTransactionId: record.paymentTransactionId,
			invoiceNumber: record.invoiceNumber,
			amountPaise: record.amountPaise,
			currency: record.currency,
			status: record.status,
			invoicePdfKey: record.invoicePdfKey,
			pdfGeneratedAt: record.pdfGeneratedAt,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
			paidAt: record.paidAt,
		});
	},

	toCreatePersistence(data: CreateBillingInvoiceInput): Prisma.BillingInvoiceUncheckedCreateInput {
		return {
			restaurantId: data.restaurantId,
			subscriptionId: data.subscriptionId,
			paymentTransactionId: data.paymentTransactionId,
			invoiceNumber: data.invoiceNumber,
			amountPaise: data.amountPaise,
			currency: data.currency ?? DEFAULT_CURRENCY,
			status: data.status ?? INVOICE_STATUS.DRAFT,
			invoicePdfKey: data.invoicePdfKey,
			pdfGeneratedAt: data.pdfGeneratedAt,
		};
	},

	toUpdatePersistence(data: UpdateBillingInvoiceInput): Prisma.BillingInvoiceUncheckedUpdateInput {
		return {
			subscriptionId: data.subscriptionId,
			paymentTransactionId: data.paymentTransactionId,
			status: data.status,
			paidAt: data.paidAt,
			invoicePdfKey: data.invoicePdfKey,
			pdfGeneratedAt: data.pdfGeneratedAt,
		};
	},
};
