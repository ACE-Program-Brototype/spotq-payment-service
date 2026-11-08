import { GetRestaurantTransactionsUseCase } from '../src/application/use-cases/transactions/get-restaurant-transactions.use-case.ts';
import { GetTransactionDetailUseCase } from '../src/application/use-cases/transactions/get-transaction-detail.use-case.ts';
import {
	InvalidDateRangeError,
	TransactionNotFoundError,
} from '../src/domain/errors/transaction.errors.ts';
import type { ITransactionQueryRepository } from '../src/domain/repositories/transaction-query.repository.interface.ts';
import type {
	PaginatedTransactionsResult,
	TransactionDetail,
} from '../src/domain/types/transaction-query.types.ts';

describe('Restaurant Transaction Use Cases (Unit Tests)', () => {
	const mockRestaurantId = '4bf628a5-d812-4fc8-99e6-7b2438883584';
	const mockTxId = '8e329a17-6421-4f3a-bfda-90e94bb10022';

	const mockPaginatedResult: PaginatedTransactionsResult = {
		transactions: [
			{
				id: mockTxId,
				orderId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
				orderNumber: 'SQ-98214',
				customerName: 'Rahul Sharma',
				razorpayPaymentId: 'pay_OEd1m8F05s9jKa',
				paymentMethod: 'UPI',
				amountPaise: 86800,
				amountFormatted: '₹868.00',
				status: 'SUCCESS',
				settlementStatus: 'PENDING_EOD',
				createdAt: new Date('2026-10-27T14:15:00.000Z'),
			},
		],
		pagination: {
			currentPage: 1,
			totalPages: 1,
			totalRecords: 1,
			limit: 20,
		},
	};

	const mockDetailResult: TransactionDetail = {
		id: mockTxId,
		restaurantId: mockRestaurantId,
		orderId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
		orderNumber: 'SQ-98214',
		customer: {
			name: 'Rahul Sharma',
			phoneMasked: '•••••• 4821',
			tableNumber: 'T-04',
			tokenNumber: 'TK-28',
		},
		amountPaise: 86800,
		amountFormatted: '₹868.00',
		currency: 'INR',
		status: 'SUCCESS',
		paymentMethod: 'UPI',
		upiVpa: 'customer@okhdfcbank',
		card: null,
		razorpayPaymentId: 'pay_OEd1m8F05s9jKa',
		razorpayOrderId: 'order_ODj4KxM721PqRs',
		bankReference: 'RRN829104829',
		billingBreakdown: {
			subtotalPaise: 82000,
			gstPaise: 4800,
			discountPaise: 0,
			grandTotalPaise: 86800,
		},
		settlement: {
			status: 'PENDING_EOD',
			settlementId: null,
			scheduledPayout: '2026-10-27T23:59:59.000Z',
		},
		refund: {
			id: 'refund-uuid-1',
			razorpayRefundId: 'rfnd_12345',
			amountPaise: 86800,
			amountFormatted: '₹868.00',
			currency: 'INR',
			status: 'PROCESSED',
			reason: 'Customer cancelled',
			processedAt: new Date('2026-10-27T14:20:00.000Z'),
			createdAt: new Date('2026-10-27T14:18:00.000Z'),
		},
		createdAt: new Date('2026-10-27T14:15:00.000Z'),
		updatedAt: new Date('2026-10-27T14:15:03.000Z'),
	};

	let mockRepo: jest.Mocked<ITransactionQueryRepository>;

	beforeEach(() => {
		mockRepo = {
			findTransactionsByRestaurant: jest.fn().mockResolvedValue(mockPaginatedResult),
			findTransactionById: jest.fn().mockResolvedValue(mockDetailResult),
			findSubscriptionBillingTransactions: jest.fn(),
		};
	});

	describe('GetRestaurantTransactionsUseCase', () => {
		it('should retrieve paginated transactions with formatted strings', async () => {
			const useCase = new GetRestaurantTransactionsUseCase(mockRepo);

			const result = await useCase.execute({
				restaurantId: mockRestaurantId,
				page: 1,
				limit: 20,
				status: 'SUCCESS',
				method: 'UPI',
				startDate: '2026-10-01',
				endDate: '2026-10-31',
			});

			expect(mockRepo.findTransactionsByRestaurant).toHaveBeenCalledWith({
				restaurantId: mockRestaurantId,
				page: 1,
				limit: 20,
				search: null,
				status: 'SUCCESS',
				method: 'UPI',
				startDate: '2026-10-01',
				endDate: '2026-10-31',
				minAmount: null,
				maxAmount: null,
				sortBy: undefined,
				sortOrder: undefined,
			});

			expect(result.transactions).toHaveLength(1);
			expect(result.transactions[0].id).toBe(mockTxId);
			expect(result.transactions[0].amountFormatted).toBe('₹868.00');
			expect(result.transactions[0].createdAt).toBe('2026-10-27T14:15:00.000Z');
			expect(result.pagination.totalRecords).toBe(1);
		});

		it('should throw InvalidDateRangeError when startDate is greater than endDate', async () => {
			const useCase = new GetRestaurantTransactionsUseCase(mockRepo);

			await expect(
				useCase.execute({
					restaurantId: mockRestaurantId,
					page: 1,
					limit: 20,
					startDate: '2026-11-01',
					endDate: '2026-10-01',
				}),
			).rejects.toThrow(InvalidDateRangeError);

			expect(mockRepo.findTransactionsByRestaurant).not.toHaveBeenCalled();
		});

		it('should handle empty transaction list without error', async () => {
			mockRepo.findTransactionsByRestaurant.mockResolvedValueOnce({
				transactions: [],
				pagination: { currentPage: 1, totalPages: 0, totalRecords: 0, limit: 20 },
			});

			const useCase = new GetRestaurantTransactionsUseCase(mockRepo);

			const result = await useCase.execute({
				restaurantId: mockRestaurantId,
				page: 1,
				limit: 20,
			});

			expect(result.transactions).toEqual([]);
			expect(result.pagination.totalRecords).toBe(0);
		});
	});

	describe('GetTransactionDetailUseCase', () => {
		it('should retrieve full transaction details with refund and customer context', async () => {
			const useCase = new GetTransactionDetailUseCase(mockRepo);

			const result = await useCase.execute({
				restaurantId: mockRestaurantId,
				transactionId: mockTxId,
			});

			expect(mockRepo.findTransactionById).toHaveBeenCalledWith(mockTxId, mockRestaurantId);
			expect(result.transaction.id).toBe(mockTxId);
			expect(result.transaction.customer.name).toBe('Rahul Sharma');
			expect(result.transaction.billingBreakdown.grandTotalPaise).toBe(86800);
			expect(result.transaction.refund).not.toBeNull();
			expect(result.transaction.refund?.razorpayRefundId).toBe('rfnd_12345');
		});

		it('should handle transaction without refunds correctly', async () => {
			mockRepo.findTransactionById.mockResolvedValueOnce({
				...mockDetailResult,
				refund: null,
			});

			const useCase = new GetTransactionDetailUseCase(mockRepo);

			const result = await useCase.execute({
				restaurantId: mockRestaurantId,
				transactionId: mockTxId,
			});

			expect(result.transaction.refund).toBeNull();
		});

		it('should throw TransactionNotFoundError when transaction does not exist', async () => {
			mockRepo.findTransactionById.mockResolvedValueOnce(null);

			const useCase = new GetTransactionDetailUseCase(mockRepo);

			await expect(
				useCase.execute({
					restaurantId: mockRestaurantId,
					transactionId: 'non-existent-id',
				}),
			).rejects.toThrow(TransactionNotFoundError);
		});
	});
});
