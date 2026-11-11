import { SubscriptionBillingHistoryPersistenceMapper } from '@infrastructure/mappers/subscription-billing-history.persistence-mapper.ts';

describe('SubscriptionBillingHistoryPersistenceMapper', () => {
	const fixedDate = new Date('2026-10-01T10:00:00.000Z');

	it('should map full Prisma record with plan and invoice to domain record', () => {
		const source = {
			id: 'tx-1',
			amountPaise: 149900,
			currency: 'INR',
			status: 'SUCCESS',
			razorpayPaymentId: 'pay_123',
			createdAt: fixedDate,
			plan: {
				code: 'QUEUE_PRO',
				name: 'SpotQ Pro',
				billingCycle: 'MONTHLY',
			},
			invoices: [
				{
					invoiceNumber: 'INV-001',
					invoicePdfKey: 'invoices/INV-001.pdf',
				},
			],
		};

		const result = SubscriptionBillingHistoryPersistenceMapper.toDomain(source);

		expect(result).toEqual({
			id: 'tx-1',
			amountPaise: 149900,
			currency: 'INR',
			status: 'SUCCESS',
			razorpayPaymentId: 'pay_123',
			createdAt: fixedDate,
			plan: {
				code: 'QUEUE_PRO',
				name: 'SpotQ Pro',
				billingCycle: 'MONTHLY',
			},
			invoice: {
				invoiceNumber: 'INV-001',
				invoicePdfKey: 'invoices/INV-001.pdf',
			},
		});
	});

	it('should handle null plan and missing invoices gracefully', () => {
		const source = {
			id: 'tx-2',
			amountPaise: 5000,
			currency: 'INR',
			status: 'CREATED',
			razorpayPaymentId: null,
			createdAt: fixedDate,
			plan: null,
			invoices: undefined,
		};

		const result = SubscriptionBillingHistoryPersistenceMapper.toDomain(source);

		expect(result.plan).toBeNull();
		expect(result.invoice).toBeNull();
	});
});
