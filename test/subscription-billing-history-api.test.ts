import type { IStorageService } from '@application/ports/services/storage.service.port.ts';
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { ITransactionQueryRepository } from '@domain/repositories/transaction-query.repository.interface.ts';
import type { PaginatedSubscriptionBillingHistoryResult } from '@domain/types/transaction-query.types.ts';
import { ALLOWED_RESTAURANT_OWNER_ROLE } from '@shared/constants/auth.constants.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import { ERROR_CODES, MESSAGES } from '@shared/constants/message.constants.ts';
import { SUBSCRIPTION_ROUTES } from '@shared/constants/routes.constants.ts';
import request from 'supertest';
import app from '../src/app.ts';

const transactionQueryRepository = container.get<ITransactionQueryRepository>(
	TYPES.Repositories.TransactionQueryRepository,
);

const storageService = container.get<IStorageService>(TYPES.Services.StorageService);

describe('Subscription Billing History API (HTTP Integration)', () => {
	const mockRestaurantId = '4bf628a5-d812-4fc8-99e6-7b2438883584';
	const otherRestaurantId = '99999999-9999-4999-8999-999999999999';
	const mockUserId = mockRestaurantId;

	const validHeaders = {
		'x-restaurant-id': mockRestaurantId,
		'x-user-id': mockUserId,
		'x-user-role': ALLOWED_RESTAURANT_OWNER_ROLE,
	};

	const mockHistoryData: PaginatedSubscriptionBillingHistoryResult = {
		records: [
			{
				id: 'tx-001',
				amountPaise: 149900,
				currency: 'INR',
				status: 'SUCCESS',
				razorpayPaymentId: 'pay_ABC123',
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
			},
		],
		totalRecords: 1,
	};

	let findSubscriptionBillingTransactionsSpy: jest.SpyInstance;
	let generatePresignedDownloadUrlSpy: jest.SpyInstance;

	beforeEach(() => {
		findSubscriptionBillingTransactionsSpy = jest
			.spyOn(transactionQueryRepository, 'findSubscriptionBillingTransactions')
			.mockResolvedValue(mockHistoryData);

		generatePresignedDownloadUrlSpy = jest
			.spyOn(storageService, 'generatePresignedDownloadUrl')
			.mockResolvedValue({
				downloadUrl: 'https://s3.amazonaws.com/spotq-invoices/INV-2026-0089.pdf?presigned=true',
				expiresInSeconds: 900,
			});
	});

	afterEach(() => {
		findSubscriptionBillingTransactionsSpy.mockRestore();
		generatePresignedDownloadUrlSpy.mockRestore();
	});

	const buildUrl = (restaurantId: string = mockRestaurantId) =>
		SUBSCRIPTION_ROUTES.HISTORY.replace(':restaurantId', restaurantId);

	it('should return 200 OK with paginated transactions and presigned invoice URL', async () => {
		const res = await request(app).get(buildUrl()).set(validHeaders);

		expect(res.status).toBe(HTTP_STATUS.OK);
		expect(res.body.success).toBe(true);
		expect(res.body.message).toBe(MESSAGES.SUBSCRIPTION_BILLING_HISTORY_FETCHED);
		expect(res.body.data.transactions).toHaveLength(1);
		expect(res.body.data.transactions[0]).toEqual({
			id: 'tx-001',
			planCode: 'QUEUE_PRO',
			planName: 'SpotQ Pro',
			billingCycle: 'MONTHLY',
			amountPaise: 149900,
			amountRupees: 1499.0,
			currency: 'INR',
			status: 'SUCCESS',
			razorpayPaymentId: 'pay_ABC123',
			invoiceNumber: 'INV-2026-0089',
			invoiceUrl: 'https://s3.amazonaws.com/spotq-invoices/INV-2026-0089.pdf?presigned=true',
			createdAt: '2026-10-01T10:15:30.000Z',
		});
		expect(res.body.data.pagination).toEqual({
			currentPage: 1,
			pageSize: 10,
			totalRecords: 1,
			totalPages: 1,
			hasNextPage: false,
			hasPrevPage: false,
		});
	});

	it('should pass pagination and status filters to use case and repository', async () => {
		const res = await request(app)
			.get(`${buildUrl()}?page=2&limit=5&status=SUCCESS`)
			.set(validHeaders);

		expect(res.status).toBe(HTTP_STATUS.OK);
		expect(findSubscriptionBillingTransactionsSpy).toHaveBeenCalledWith({
			restaurantId: mockRestaurantId,
			page: 2,
			limit: 5,
			status: 'SUCCESS',
		});
	});

	it('should return 401 UNAUTHORIZED when authentication headers are missing', async () => {
		const res = await request(app).get(buildUrl());

		expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe(ERROR_CODES.UNAUTHORIZED);
	});

	it('should return 403 FORBIDDEN when user role is not permitted (e.g. CUSTOMER)', async () => {
		const res = await request(app).get(buildUrl()).set({
			'x-restaurant-id': mockRestaurantId,
			'x-user-id': mockUserId,
			'x-user-role': 'CUSTOMER',
		});

		expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe(ERROR_CODES.FORBIDDEN);
	});

	it('should return 403 FORBIDDEN when caller attempts cross-tenant access to another restaurant', async () => {
		const res = await request(app).get(buildUrl(otherRestaurantId)).set({
			'x-restaurant-id': mockRestaurantId, // Authenticated for restaurant A
			'x-user-id': mockUserId,
			'x-user-role': ALLOWED_RESTAURANT_OWNER_ROLE,
		});

		expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe('FORBIDDEN_SUBSCRIPTION_ACCESS');
		expect(res.body.message).toBe(MESSAGES.FORBIDDEN_SUBSCRIPTION_ACCESS);
	});

	it('should return 403 FORBIDDEN when PLATFORM_ADMIN attempts to access restaurant dashboard history', async () => {
		const res = await request(app).get(buildUrl(otherRestaurantId)).set({
			'x-restaurant-id': mockRestaurantId,
			'x-user-id': mockUserId,
			'x-user-role': 'PLATFORM_ADMIN',
		});

		expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe(ERROR_CODES.FORBIDDEN);
	});

	it('should return 422 UNPROCESSABLE_ENTITY when restaurantId is not a valid UUID', async () => {
		const res = await request(app).get(buildUrl('invalid-uuid')).set(validHeaders);

		expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe(ERROR_CODES.VALIDATION_ERROR);
	});

	it('should return 422 UNPROCESSABLE_ENTITY when limit exceeds 50', async () => {
		const res = await request(app).get(`${buildUrl()}?limit=51`).set(validHeaders);

		expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe(ERROR_CODES.VALIDATION_ERROR);
	});

	it('should return 422 UNPROCESSABLE_ENTITY when status is unsupported', async () => {
		const res = await request(app).get(`${buildUrl()}?status=REFUNDED`).set(validHeaders);

		expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		expect(res.body.success).toBe(false);
		expect(res.body.error).toBe(ERROR_CODES.VALIDATION_ERROR);
	});
});
