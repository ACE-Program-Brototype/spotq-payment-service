import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { ITransactionQueryRepository } from '@domain/repositories/transaction-query.repository.interface.ts';
import type {
	PaginatedTransactionsResult,
	TransactionDetail,
} from '@domain/types/transaction-query.types.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import { ERROR_CODES, MESSAGES } from '@shared/constants/message.constants.ts';
import { TRANSACTION_ROUTES } from '@shared/constants/routes.constants.ts';
import request from 'supertest';
import app from '../src/app.ts';

const transactionQueryRepository = container.get<ITransactionQueryRepository>(
	TYPES.Repositories.TransactionQueryRepository,
);

describe('Restaurant Payment Transactions API (HTTP Integration)', () => {
	const mockRestaurantId = '4bf628a5-d812-4fc8-99e6-7b2438883584';
	const mockUserId = '11111111-2222-3333-4444-555555555555';
	const mockTxId = '8e329a17-6421-4f3a-bfda-90e94bb10022';

	const validHeaders = {
		'x-restaurant-id': mockRestaurantId,
		'x-user-id': mockUserId,
		'x-user-role': 'RESTAURANT_ADMIN',
	};

	const mockPaginatedData: PaginatedTransactionsResult = {
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
			totalPages: 12,
			totalRecords: 240,
			limit: 20,
		},
	};

	const mockDetailData: TransactionDetail = {
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
		refund: null,
		createdAt: new Date('2026-10-27T14:15:00.000Z'),
		updatedAt: new Date('2026-10-27T14:15:03.000Z'),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		jest
			.spyOn(transactionQueryRepository, 'findTransactionsByRestaurant')
			.mockResolvedValue(mockPaginatedData);
		jest.spyOn(transactionQueryRepository, 'findTransactionById').mockResolvedValue(mockDetailData);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('Multi-Tenant Gateway Authentication', () => {
		it('should return 401 Unauthorized when x-restaurant-id is missing', async () => {
			const res = await request(app)
				.get(TRANSACTION_ROUTES.BASE)
				.set('x-user-id', mockUserId)
				.set('x-user-role', 'RESTAURANT_ADMIN');

			expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe(ERROR_CODES.UNAUTHORIZED);
			expect(res.body.message).toBe(MESSAGES.UNAUTHORIZED_ACCESS);
		});

		it('should return 401 Unauthorized when x-user-id is missing', async () => {
			const res = await request(app)
				.get(TRANSACTION_ROUTES.BASE)
				.set('x-restaurant-id', mockRestaurantId)
				.set('x-user-role', 'RESTAURANT_ADMIN');

			expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe(ERROR_CODES.UNAUTHORIZED);
		});

		it('should return 403 Forbidden when x-user-role is not RESTAURANT_ADMIN or RESTAURANT_STAFF', async () => {
			const res = await request(app)
				.get(TRANSACTION_ROUTES.BASE)
				.set('x-restaurant-id', mockRestaurantId)
				.set('x-user-id', mockUserId)
				.set('x-user-role', 'CUSTOMER');

			expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe(ERROR_CODES.FORBIDDEN);
			expect(res.body.message).toBe(MESSAGES.FORBIDDEN_ACCESS);
		});

		it('should allow access when x-user-role is RESTAURANT_STAFF', async () => {
			const res = await request(app)
				.get(TRANSACTION_ROUTES.BASE)
				.set('x-restaurant-id', mockRestaurantId)
				.set('x-user-id', mockUserId)
				.set('x-user-role', 'RESTAURANT_STAFF');

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
		});

		it('should allow access when x-user-role is RESTAURANT_OWNER or lowercase restaurant_owner', async () => {
			const res1 = await request(app)
				.get(TRANSACTION_ROUTES.BASE)
				.set('x-restaurant-id', mockRestaurantId)
				.set('x-user-id', mockUserId)
				.set('x-user-role', 'RESTAURANT_OWNER');

			expect(res1.status).toBe(HTTP_STATUS.OK);
			expect(res1.body.success).toBe(true);

			const res2 = await request(app)
				.get(TRANSACTION_ROUTES.BASE)
				.set('x-restaurant-id', mockRestaurantId)
				.set('x-user-id', mockUserId)
				.set('x-user-role', 'restaurant_owner');

			expect(res2.status).toBe(HTTP_STATUS.OK);
			expect(res2.body.success).toBe(true);
		});
	});

	describe(`GET ${TRANSACTION_ROUTES.BASE}`, () => {
		it('should return 200 OK with paginated transactions and default filters', async () => {
			const res = await request(app).get(TRANSACTION_ROUTES.BASE).set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(MESSAGES.TRANSACTIONS_RETRIEVED);
			expect(res.body.data.transactions).toHaveLength(1);
			expect(res.body.data.transactions[0].id).toBe(mockTxId);
			expect(res.body.data.transactions[0].amountFormatted).toBe('₹868.00');
			expect(res.body.data.pagination.currentPage).toBe(1);
			expect(res.body.data.pagination.totalRecords).toBe(240);
		});

		it('should also work on full prefix route /api/v1/payments/transactions', async () => {
			const res = await request(app).get(TRANSACTION_ROUTES.API_V1_BASE).set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.data.transactions).toHaveLength(1);
		});

		it('should pass query filters (status, method, search, amount, dates) to repository', async () => {
			const res = await request(app)
				.get(
					`${TRANSACTION_ROUTES.BASE}?page=2&limit=10&status=SUCCESS&method=UPI&search=SQ-982&minAmount=5000&maxAmount=100000&startDate=2026-10-01&endDate=2026-10-31&sortBy=amountPaise&sortOrder=asc`,
				)
				.set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(transactionQueryRepository.findTransactionsByRestaurant).toHaveBeenCalledWith({
				restaurantId: mockRestaurantId,
				page: 2,
				limit: 10,
				search: 'SQ-982',
				status: 'SUCCESS',
				method: 'UPI',
				startDate: '2026-10-01',
				endDate: '2026-10-31',
				minAmount: 5000,
				maxAmount: 100000,
				sortBy: 'amountPaise',
				sortOrder: 'asc',
			});
		});

		it('should return 400 Bad Request when startDate is after endDate', async () => {
			const res = await request(app)
				.get(`${TRANSACTION_ROUTES.BASE}?startDate=2026-11-01&endDate=2026-10-01`)
				.set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe(ERROR_CODES.BAD_REQUEST);
			expect(res.body.message).toBe(MESSAGES.INVALID_DATE_RANGE);
		});

		it('should succeed 200 OK when query parameters are empty strings and ignore them', async () => {
			const res = await request(app)
				.get(
					`${TRANSACTION_ROUTES.BASE}?search=&startDate=&endDate=&minAmount=&maxAmount=&status=&method=`,
				)
				.set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.data.transactions).toHaveLength(1);
		});

		it('should return 422 Unprocessable Entity when minAmount is greater than maxAmount', async () => {
			const res = await request(app)
				.get(`${TRANSACTION_ROUTES.BASE}?minAmount=50000&maxAmount=10000`)
				.set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe(ERROR_CODES.VALIDATION_ERROR);
		});

		it('should return 422 Unprocessable Entity when date is not a valid calendar date', async () => {
			const res = await request(app)
				.get(`${TRANSACTION_ROUTES.BASE}?startDate=2026-02-31`)
				.set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe(ERROR_CODES.VALIDATION_ERROR);
		});

		it('should return 422 Unprocessable Entity when pagination parameters are invalid', async () => {
			const res = await request(app)
				.get(`${TRANSACTION_ROUTES.BASE}?page=0&limit=500`)
				.set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe(ERROR_CODES.VALIDATION_ERROR);
		});
	});

	describe(`GET ${TRANSACTION_ROUTES.BY_ID}`, () => {
		it('should return 200 OK with deep transaction details', async () => {
			const res = await request(app).get(`/transactions/${mockTxId}`).set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(MESSAGES.TRANSACTION_DETAILS_RETRIEVED);
			expect(res.body.data.transaction.id).toBe(mockTxId);
			expect(res.body.data.transaction.restaurantId).toBe(mockRestaurantId);
			expect(res.body.data.transaction.customer.name).toBe('Rahul Sharma');
			expect(res.body.data.transaction.billingBreakdown.grandTotalPaise).toBe(86800);
			expect(res.body.data.transaction.amountFormatted).toBe('₹868.00');
		});

		it('should return 400 Bad Request when transaction ID is malformed', async () => {
			const res = await request(app).get('/transactions/not-a-valid-uuid').set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe(ERROR_CODES.BAD_REQUEST);
			expect(res.body.message).toBe(MESSAGES.INVALID_TRANSACTION_ID);
		});

		it('should return 404 Not Found when transaction does not exist or belongs to another restaurant', async () => {
			jest.spyOn(transactionQueryRepository, 'findTransactionById').mockResolvedValueOnce(null);

			const nonExistentId = '99999999-9999-4999-a999-999999999999';
			const res = await request(app).get(`/transactions/${nonExistentId}`).set(validHeaders);

			expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe(ERROR_CODES.NOT_FOUND);
			expect(res.body.message).toBe(MESSAGES.TRANSACTION_NOT_FOUND);
		});
	});
});
