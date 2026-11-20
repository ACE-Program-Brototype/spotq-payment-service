import { SubscriptionBillingHistoryMapper } from '@application/mappers/subscriptions/subscription-billing-history.mapper.ts';
import type { SubscriptionBillingTransactionRecord } from '@domain/types/transaction-query.types.ts';

describe('SubscriptionBillingHistoryMapper', () => {
	const mockRecord: SubscriptionBillingTransactionRecord = {
		id: 'tx-123',
		amountPaise: 149900,
		currency: 'INR',
		status: 'SUCCESS',
		razorpayPaymentId: 'pay_123456',
		createdAt: new Date('2026-10-01T10:15:30.000Z'),
		plan: {
			code: 'QUEUE_PRO',
			name: 'SpotQ Pro',
			billingCycle: 'MONTHLY',
		},
		invoice: {
			invoiceNumber: 'INV-2026-0089',
			invoicePdfKey: 'invoices/2026/INV-2026-0089.pdf',
		},
	};

	it('should correctly map record to SubscriptionBillingTransactionItemDTO with invoiceUrl', () => {
		const invoiceUrl = 'https://s3.amazonaws.com/spotq-invoices/INV-2026-0089.pdf?signed=true';
		const dto = SubscriptionBillingHistoryMapper.toTransactionItemDTO(mockRecord, invoiceUrl);

		expect(dto).toEqual({
			id: 'tx-123',
			planCode: 'QUEUE_PRO',
			planName: 'SpotQ Pro',
			billingCycle: 'MONTHLY',
			amountPaise: 149900,
			amountRupees: 1499.0,
			currency: 'INR',
			status: 'SUCCESS',
			razorpayPaymentId: 'pay_123456',
			invoiceNumber: 'INV-2026-0089',
			invoiceUrl,
			createdAt: '2026-10-01T10:15:30.000Z',
		});
	});

	it('should fallback gracefully when plan or invoice is missing', () => {
		const minimalRecord: SubscriptionBillingTransactionRecord = {
			id: 'tx-456',
			amountPaise: 5000,
			currency: 'INR',
			status: 'CREATED',
			razorpayPaymentId: null,
			createdAt: new Date('2026-10-02T10:00:00.000Z'),
			plan: null,
			invoice: null,
		};

		const dto = SubscriptionBillingHistoryMapper.toTransactionItemDTO(minimalRecord, null);

		expect(dto.planCode).toBe('UNKNOWN');
		expect(dto.planName).toBe('Subscription Plan');
		expect(dto.billingCycle).toBe('MONTHLY');
		expect(dto.amountRupees).toBe(50.0);
		expect(dto.invoiceNumber).toBeNull();
		expect(dto.invoiceUrl).toBeNull();
		expect(dto.razorpayPaymentId).toBeNull();
	});

	it('should calculate pagination metadata accurately in toResponseDTO', () => {
		const items = [SubscriptionBillingHistoryMapper.toTransactionItemDTO(mockRecord, null)];

		const response = SubscriptionBillingHistoryMapper.toResponseDTO(items, {
			currentPage: 2,
			pageSize: 10,
			totalRecords: 25,
		});

		expect(response.transactions).toHaveLength(1);
		expect(response.pagination).toEqual({
			currentPage: 2,
			pageSize: 10,
			totalRecords: 25,
			totalPages: 3,
			hasNextPage: true,
			hasPrevPage: true,
		});
	});

	it('should handle zero total records properly', () => {
		const response = SubscriptionBillingHistoryMapper.toResponseDTO([], {
			currentPage: 1,
			pageSize: 10,
			totalRecords: 0,
		});

		expect(response.transactions).toHaveLength(0);
		expect(response.pagination).toEqual({
			currentPage: 1,
			pageSize: 10,
			totalRecords: 0,
			totalPages: 0,
			hasNextPage: false,
			hasPrevPage: false,
		});
	});
});
