import { GetCustomerPaymentHistoryUseCase } from '@application/use-cases/customer-payment/get-customer-payment-history.use-case.ts';
import { ForbiddenAccessError, InvalidDateRangeError } from '@domain/errors/transaction.errors.ts';
import type { ITransactionQueryRepository } from '@domain/repositories/transaction-query.repository.interface.ts';
import type { PaginatedCustomerTransactionsResult } from '@domain/types/transaction-query.types.ts';

describe('GetCustomerPaymentHistoryUseCase (SCRUM-35)', () => {
	let mockRepo: jest.Mocked<ITransactionQueryRepository>;
	let useCase: GetCustomerPaymentHistoryUseCase;

	const mockPaginatedResult: PaginatedCustomerTransactionsResult = {
		transactions: [
			{
				transactionId: '8e329a17-6421-4f3a-bfda-90e94bb10022',
				orderId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
				restaurantId: '2ba55e12-4211-4f2a-bada-80e83bb09911',
				amountPaise: 125000,
				amountInRupees: 1250.0,
				currency: 'INR',
				paymentMethod: 'UPI',
				status: 'CAPTURED',
				failureReason: null,
				razorpayPaymentId: 'pay_Oqk1028X9123',
				razorpayOrderId: 'order_EK98a123cd45',
				createdAt: new Date('2026-10-14T19:42:00.000Z'),
				hasInvoice: true,
				invoiceUrl: '/api/v1/payments/transactions/8e329a17-6421-4f3a-bfda-90e94bb10022/invoice',
				retryEligible: false,
				retryExpiresAt: null,
				refundDetails: null,
			},
			{
				transactionId: '7d218a06-5310-4e29-aeba-8fd83aa09911',
				orderId: '2ea74e53-4606-4451-a1eb-1b852e55aea5',
				restaurantId: '2ba55e12-4211-4f2a-bada-80e83bb09911',
				amountPaise: 54000,
				amountInRupees: 540.0,
				currency: 'INR',
				paymentMethod: 'UPI',
				status: 'FAILED',
				failureReason: 'Payment timed out by customer bank',
				razorpayPaymentId: null,
				razorpayOrderId: 'order_EK98a123cd45',
				createdAt: new Date('2026-10-27T03:35:00.000Z'),
				hasInvoice: false,
				invoiceUrl: null,
				retryEligible: true,
				retryExpiresAt: '2026-10-27T03:50:00.000Z',
				refundDetails: null,
			},
		],
		pagination: {
			total: 2,
			page: 1,
			limit: 10,
			totalPages: 1,
			hasNext: false,
			hasPrev: false,
		},
	};

	beforeEach(() => {
		mockRepo = {
			findTransactionsByRestaurant: jest.fn(),
			findTransactionById: jest.fn(),
			findTransactionsByCustomer: jest.fn().mockResolvedValue(mockPaginatedResult),
		};
		useCase = new GetCustomerPaymentHistoryUseCase(mockRepo);
	});

	it('should return paginated customer payment transactions successfully', async () => {
		const result = await useCase.execute({
			customerId: 'cust-123',
			page: 1,
			limit: 10,
		});

		expect(result.transactions).toHaveLength(2);
		expect(result.pagination.total).toBe(2);
		expect(result.transactions[0].transactionId).toBe('8e329a17-6421-4f3a-bfda-90e94bb10022');
		expect(result.transactions[0].hasInvoice).toBe(true);
		expect(result.transactions[1].retryEligible).toBe(true);
		expect(mockRepo.findTransactionsByCustomer).toHaveBeenCalledWith({
			customerId: 'cust-123',
			page: 1,
			limit: 10,
			status: null,
			startDate: null,
			endDate: null,
			sortBy: 'createdAt',
			sortOrder: 'desc',
		});
	});

	it('should throw ForbiddenAccessError when customerId is missing or empty', async () => {
		await expect(
			useCase.execute({
				customerId: '',
			}),
		).rejects.toThrow(ForbiddenAccessError);

		await expect(
			useCase.execute({
				customerId: '   ',
			}),
		).rejects.toThrow(ForbiddenAccessError);

		await expect(
			useCase.execute({
				customerId: undefined as unknown as string,
			}),
		).rejects.toThrow(ForbiddenAccessError);
	});

	it('should throw InvalidDateRangeError when startDate is after endDate', async () => {
		await expect(
			useCase.execute({
				customerId: 'cust-123',
				startDate: '2026-11-10',
				endDate: '2026-11-01',
			}),
		).rejects.toThrow(InvalidDateRangeError);
	});
});
