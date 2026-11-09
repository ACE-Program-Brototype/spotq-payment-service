import type { SubscriptionBillingTransactionRecord } from '@domain/types/transaction-query.types.ts';

export interface PrismaSubscriptionBillingTransactionSource {
	id: string;
	amountPaise: number;
	currency: string;
	status: string;
	razorpayPaymentId: string | null;
	createdAt: Date;
	plan?: {
		code: string;
		name: string;
		billingCycle: string;
	} | null;
	subscription?: {
		plan?: {
			code: string;
			name: string;
			billingCycle: string;
		} | null;
	} | null;
	invoices?: Array<{
		invoiceNumber: string;
		invoicePdfKey: string | null;
	}>;
}

export const SubscriptionBillingHistoryPersistenceMapper = {
	toDomain(
		record: PrismaSubscriptionBillingTransactionSource,
	): SubscriptionBillingTransactionRecord {
		const plan = record.plan ?? record.subscription?.plan ?? null;
		const invoice = record.invoices?.[0] ?? null;

		return {
			id: record.id,
			amountPaise: record.amountPaise,
			currency: record.currency,
			status: record.status,
			razorpayPaymentId: record.razorpayPaymentId,
			createdAt: record.createdAt,
			plan: plan
				? {
						code: plan.code,
						name: plan.name,
						billingCycle: plan.billingCycle,
					}
				: null,
			invoice: invoice
				? {
						invoiceNumber: invoice.invoiceNumber,
						invoicePdfKey: invoice.invoicePdfKey,
					}
				: null,
		};
	},
};
