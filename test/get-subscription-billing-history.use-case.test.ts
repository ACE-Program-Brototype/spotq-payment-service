import type { IStorageService } from '@application/ports/services/storage.service.port.ts';
import { GetSubscriptionBillingHistoryUseCase } from '@application/use-cases/subscriptions/get-subscription-billing-history.use-case.ts';
import type { ITransactionQueryRepository } from '@domain/repositories/transaction-query.repository.interface.ts';
import type { SubscriptionBillingTransactionRecord } from '@domain/types/transaction-query.types.ts';

describe('GetSubscriptionBillingHistoryUseCase', () => {
	const mockRestaurantId = '11111111-1111-4111-8111-111111111111';

	let mockRepo: jest.Mocked<ITransactionQueryRepository>;
	let mockStorageService: jest.Mocked<IStorageService>;
	let useCase: GetSubscriptionBillingHistoryUseCase;

	const mockRecordWithInvoice: SubscriptionBillingTransactionRecord = {
		id: 'tx-1',
		amountPaise: 149900,
		currency: 'INR',
		status: 'SUCCESS',
		razorpayPaymentId: 'pay_001',
		createdAt: new Date('2026-10-01T10:00:00.000Z'),
		plan: {
			code: 'QUEUE_PRO',
			name: 'SpotQ Pro',
			billingCycle: 'MONTHLY',
		},
		invoice: {
			invoiceNumber: 'INV-2026-0001',
			invoicePdfKey: 'invoices/INV-2026-0001.pdf',
		},
	};

	const mockRecordWithoutInvoice: SubscriptionBillingTransactionRecord = {
		id: 'tx-2',
		amountPaise: 149900,
		currency: 'INR',
		status: 'FAILED',
		razorpayPaymentId: null,
		createdAt: new Date('2026-09-01T10:00:00.000Z'),
		plan: {
			code: 'QUEUE_PRO',
			name: 'SpotQ Pro',
			billingCycle: 'MONTHLY',
		},
		invoice: null,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockRepo = {
			findTransactionsByRestaurant: jest.fn(),
			findTransactionById: jest.fn(),
			findSubscriptionBillingTransactions: jest.fn().mockResolvedValue({
				records: [mockRecordWithInvoice, mockRecordWithoutInvoice],
				totalRecords: 2,
			}),
		};

		mockStorageService = {
			generatePresignedDownloadUrl: jest.fn().mockResolvedValue({
				downloadUrl: 'https://s3.signed-url.com/inv-1.pdf',
				expiresInSeconds: 900,
			}),
		};

		useCase = new GetSubscriptionBillingHistoryUseCase(mockRepo, mockStorageService);
	});

	it('should return paginated transactions with presigned URLs for available invoices', async () => {
		const result = await useCase.execute({
			restaurantId: mockRestaurantId,
			page: 1,
			limit: 10,
		});

		expect(mockRepo.findSubscriptionBillingTransactions).toHaveBeenCalledWith({
			restaurantId: mockRestaurantId,
			page: 1,
			limit: 10,
			status: undefined,
		});

		expect(mockStorageService.generatePresignedDownloadUrl).toHaveBeenCalledTimes(1);
		expect(mockStorageService.generatePresignedDownloadUrl).toHaveBeenCalledWith({
			key: 'invoices/INV-2026-0001.pdf',
			expiresInSeconds: 900,
		});

		expect(result.transactions).toHaveLength(2);
		expect(result.transactions[0]).toEqual({
			id: 'tx-1',
			planCode: 'QUEUE_PRO',
			planName: 'SpotQ Pro',
			billingCycle: 'MONTHLY',
			amountPaise: 149900,
			amountRupees: 1499.0,
			currency: 'INR',
			status: 'SUCCESS',
			razorpayPaymentId: 'pay_001',
			invoiceNumber: 'INV-2026-0001',
			invoiceUrl: 'https://s3.signed-url.com/inv-1.pdf',
			createdAt: '2026-10-01T10:00:00.000Z',
		});

		expect(result.transactions[1]).toEqual({
			id: 'tx-2',
			planCode: 'QUEUE_PRO',
			planName: 'SpotQ Pro',
			billingCycle: 'MONTHLY',
			amountPaise: 149900,
			amountRupees: 1499.0,
			currency: 'INR',
			status: 'FAILED',
			razorpayPaymentId: null,
			invoiceNumber: null,
			invoiceUrl: null,
			createdAt: '2026-09-01T10:00:00.000Z',
		});

		expect(result.pagination).toEqual({
			currentPage: 1,
			pageSize: 10,
			totalRecords: 2,
			totalPages: 1,
			hasNextPage: false,
			hasPrevPage: false,
		});
	});

	it('should pass status filter to the repository when supplied', async () => {
		await useCase.execute({
			restaurantId: mockRestaurantId,
			page: 2,
			limit: 5,
			status: 'SUCCESS',
		});

		expect(mockRepo.findSubscriptionBillingTransactions).toHaveBeenCalledWith({
			restaurantId: mockRestaurantId,
			page: 2,
			limit: 5,
			status: 'SUCCESS',
		});
	});

	it('should clamp limit to max 50 and page to min 1', async () => {
		await useCase.execute({
			restaurantId: mockRestaurantId,
			page: -5,
			limit: 100,
		});

		expect(mockRepo.findSubscriptionBillingTransactions).toHaveBeenCalledWith({
			restaurantId: mockRestaurantId,
			page: 1,
			limit: 50,
			status: undefined,
		});
	});

	it('should gracefully handle S3 presigner failure and set invoiceUrl to null', async () => {
		mockStorageService.generatePresignedDownloadUrl.mockRejectedValueOnce(
			new Error('S3 connection timeout'),
		);

		const result = await useCase.execute({
			restaurantId: mockRestaurantId,
			page: 1,
			limit: 10,
		});

		expect(result.transactions[0].invoiceUrl).toBeNull();
		expect(result.transactions[0].invoiceNumber).toBe('INV-2026-0001');
		expect(result.transactions).toHaveLength(2);
	});
});
