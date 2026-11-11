import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import {
	PaymentTransaction,
	type PaymentTransactionProps,
} from '@domain/entities/payment-transaction.entity.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { ITransactionQueryRepository } from '@domain/repositories/transaction-query.repository.interface.ts';
import type { PaginatedCustomerTransactionsResult } from '@domain/types/transaction-query.types.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import { CUSTOMER_PAYMENT_ROUTES } from '@shared/constants/routes.constants.ts';
import request from 'supertest';
import app from '../src/app.ts';

const transactionQueryRepository = container.get<ITransactionQueryRepository>(
	TYPES.Repositories.TransactionQueryRepository,
);
const paymentTransactionRepository = container.get<IPaymentTransactionRepository>(
	TYPES.Repositories.PaymentTransactionRepository,
);

describe('Customer Payment History & Failed Payment Retry API (SCRUM-35)', () => {
	const mockCustomerId = '10101010-1010-4010-a010-101010101010';
	const mockTxId = '8e329a17-6421-4f3a-bfda-90e94bb10022';
	const mockOrderId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
	const mockRazorpayOrderId = 'order_EK98a123cd45';

	const validCustomerHeaders = {
		'x-user-id': mockCustomerId,
		'x-user-role': 'CUSTOMER',
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('GET /api/v1/payments/history', () => {
		const mockPaginatedHistory: PaginatedCustomerTransactionsResult = {
			transactions: [
				{
					transactionId: mockTxId,
					orderId: mockOrderId,
					restaurantId: '2ba55e12-4211-4f2a-bada-80e83bb09911',
					amountPaise: 125000,
					amountInRupees: 1250.0,
					currency: 'INR',
					paymentMethod: 'UPI',
					status: 'CAPTURED',
					failureReason: null,
					razorpayPaymentId: 'pay_Oqk1028X9123',
					razorpayOrderId: mockRazorpayOrderId,
					createdAt: new Date('2026-10-14T19:42:00.000Z'),
					hasInvoice: true,
					invoiceUrl: `/api/v1/payments/transactions/${mockTxId}/invoice`,
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
					razorpayOrderId: 'order_failed_123',
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

		it('should return 401 UNAUTHORIZED when customer auth headers are missing', async () => {
			const res = await request(app)
				.get(CUSTOMER_PAYMENT_ROUTES.HISTORY)
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
		});

		it('should return 403 FORBIDDEN when user role is not CUSTOMER', async () => {
			const res = await request(app)
				.get(CUSTOMER_PAYMENT_ROUTES.HISTORY)
				.set('x-user-id', mockCustomerId)
				.set('x-user-role', 'STAFF')
				.expect(HTTP_STATUS.FORBIDDEN);

			expect(res.body.success).toBe(false);
		});

		it('should return 200 OK with paginated history for authenticated customer', async () => {
			jest
				.spyOn(transactionQueryRepository, 'findTransactionsByCustomer')
				.mockResolvedValueOnce(mockPaginatedHistory);

			const res = await request(app)
				.get(CUSTOMER_PAYMENT_ROUTES.HISTORY)
				.set(validCustomerHeaders)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe('Payment history retrieved successfully');
			expect(res.body.data.transactions).toHaveLength(2);
			expect(res.body.data.transactions[0].transactionId).toBe(mockTxId);
			expect(res.body.data.transactions[0].hasInvoice).toBe(true);
			expect(res.body.data.transactions[1].retryEligible).toBe(true);
			expect(res.body.data.pagination.total).toBe(2);
		});

		it('should forward query filters to the repository', async () => {
			const spy = jest
				.spyOn(transactionQueryRepository, 'findTransactionsByCustomer')
				.mockResolvedValueOnce({
					transactions: [],
					pagination: {
						total: 0,
						page: 1,
						limit: 10,
						totalPages: 0,
						hasNext: false,
						hasPrev: false,
					},
				});

			await request(app)
				.get(
					`${CUSTOMER_PAYMENT_ROUTES.HISTORY}?page=2&limit=5&status=FAILED&sortBy=amountPaise&sortOrder=asc`,
				)
				.set(validCustomerHeaders)
				.expect(HTTP_STATUS.OK);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					customerId: mockCustomerId,
					page: 2,
					limit: 5,
					status: 'FAILED',
					sortBy: 'amountPaise',
					sortOrder: 'asc',
				}),
			);
		});
	});

	describe('POST /transactions/:id/retry', () => {
		const retryUrl = (id: string) => CUSTOMER_PAYMENT_ROUTES.RETRY.replace(':id', id);

		const createMockTx = (overrides?: Partial<PaymentTransactionProps>) => {
			return new PaymentTransaction({
				id: mockTxId,
				restaurantId: '2ba55e12-4211-4f2a-bada-80e83bb09911',
				customerId: mockCustomerId,
				orderId: mockOrderId,
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 54000,
				currency: 'INR',
				status: 'FAILED',
				failureReason: 'Payment timed out',
				createdAt: new Date(),
				updatedAt: new Date(),
				...overrides,
			});
		};

		it('should return 401 UNAUTHORIZED when customer auth headers are missing', async () => {
			const res = await request(app).post(retryUrl(mockTxId)).expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
		});

		it('should return 422 UNPROCESSABLE_ENTITY when transaction id is not a valid UUID', async () => {
			const res = await request(app)
				.post(retryUrl('not-a-valid-uuid'))
				.set(validCustomerHeaders)
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
		});

		it('should return 404 NOT_FOUND when transaction does not exist', async () => {
			jest.spyOn(paymentTransactionRepository, 'findById').mockResolvedValueOnce(null);

			const res = await request(app)
				.post(retryUrl(mockTxId))
				.set(validCustomerHeaders)
				.expect(HTTP_STATUS.NOT_FOUND);

			expect(res.body.success).toBe(false);
		});

		it('should return 403 FORBIDDEN when customer attempts to retry another user transaction', async () => {
			const foreignTx = createMockTx({
				customerId: '99999999-9999-9999-9999-999999999999',
			});
			jest.spyOn(paymentTransactionRepository, 'findById').mockResolvedValueOnce(foreignTx);

			const res = await request(app)
				.post(retryUrl(mockTxId))
				.set(validCustomerHeaders)
				.expect(HTTP_STATUS.FORBIDDEN);

			expect(res.body.success).toBe(false);
		});

		it('should return 422 UNPROCESSABLE_ENTITY (NOT_RETRYABLE) when transaction status is CAPTURED', async () => {
			const capturedTx = createMockTx({ status: 'CAPTURED' });
			jest.spyOn(paymentTransactionRepository, 'findById').mockResolvedValueOnce(capturedTx);

			const res = await request(app)
				.post(retryUrl(mockTxId))
				.set(validCustomerHeaders)
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('NOT_RETRYABLE');
		});

		it('should return 409 CONFLICT (ALREADY_PAID) when order was paid on another attempt', async () => {
			const failedTx = createMockTx({ status: 'FAILED' });
			const siblingCaptured = createMockTx({
				id: '7d218a06-5310-4e29-aeba-8fd83aa09999',
				status: 'CAPTURED',
			});

			jest.spyOn(paymentTransactionRepository, 'findById').mockResolvedValueOnce(failedTx);
			jest
				.spyOn(paymentTransactionRepository, 'findCapturedByOrderId')
				.mockResolvedValueOnce(siblingCaptured);

			const res = await request(app)
				.post(retryUrl(mockTxId))
				.set(validCustomerHeaders)
				.expect(HTTP_STATUS.CONFLICT);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('ALREADY_PAID');
		});

		it('should return 422 UNPROCESSABLE_ENTITY (ORDER_EXPIRED) when retry window (>15m) elapsed', async () => {
			const staleTx = createMockTx({
				status: 'FAILED',
				createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
			});

			jest.spyOn(paymentTransactionRepository, 'findById').mockResolvedValueOnce(staleTx);
			jest.spyOn(paymentTransactionRepository, 'findCapturedByOrderId').mockResolvedValueOnce(null);

			const res = await request(app)
				.post(retryUrl(mockTxId))
				.set(validCustomerHeaders)
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('ORDER_EXPIRED');
		});

		it('should return 200 OK and reset transaction in-place to CREATED without creating duplicate rows', async () => {
			const failedTx = createMockTx({ status: 'FAILED' });
			const resetTx = createMockTx({
				status: 'CREATED',
				failureReason: null,
			});

			jest.spyOn(paymentTransactionRepository, 'findById').mockResolvedValueOnce(failedTx);
			jest.spyOn(paymentTransactionRepository, 'findCapturedByOrderId').mockResolvedValueOnce(null);
			const resetSpy = jest
				.spyOn(paymentTransactionRepository, 'resetToCreated')
				.mockResolvedValueOnce(resetTx);

			const res = await request(app)
				.post(retryUrl(mockTxId))
				.set(validCustomerHeaders)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe('Payment retry initiated successfully');
			expect(res.body.data).toEqual(
				expect.objectContaining({
					transactionId: mockTxId,
					orderId: mockOrderId,
					razorpayOrderId: mockRazorpayOrderId,
					amountPaise: 54000,
					amountInRupees: 540,
					currency: 'INR',
					keyId: expect.any(String),
				}),
			);
			expect(resetSpy).toHaveBeenCalledWith(failedTx);
		});
	});
});
