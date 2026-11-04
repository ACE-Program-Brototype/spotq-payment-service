import { PrismaTransactionQueryRepository } from '../src/infrastructure/repositories/prisma-transaction-query.repository.ts';

describe('PrismaTransactionQueryRepository (Unit Tests)', () => {
	const mockRestaurantId = '4bf628a5-d812-4fc8-99e6-7b2438883584';
	const mockTxId = '8e329a17-6421-4f3a-bfda-90e94bb10022';

	let repository: PrismaTransactionQueryRepository;
	let mockPrisma: {
		paymentTransaction: {
			count: jest.Mock;
			findMany: jest.Mock;
			findFirst: jest.Mock;
		};
	};

	beforeEach(() => {
		mockPrisma = {
			paymentTransaction: {
				count: jest.fn().mockResolvedValue(1),
				findMany: jest.fn().mockResolvedValue([
					{
						id: mockTxId,
						restaurantId: mockRestaurantId,
						orderId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
						razorpayPaymentId: 'pay_OEd1m8F05s9jKa',
						amountPaise: 86800,
						status: 'SUCCESS',
						metadata: {
							orderNumber: 'SQ-98214',
							customerName: 'Rahul Sharma',
							paymentMethod: 'UPI',
							settlement: {
								status: 'PENDING_EOD',
							},
						},
						createdAt: new Date('2026-10-27T14:15:00.000Z'),
					},
				]),
				findFirst: jest.fn().mockResolvedValue({
					id: mockTxId,
					restaurantId: mockRestaurantId,
					orderId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
					razorpayOrderId: 'order_ODj4KxM721PqRs',
					razorpayPaymentId: 'pay_OEd1m8F05s9jKa',
					amountPaise: 86800,
					currency: 'INR',
					status: 'SUCCESS',
					metadata: {
						orderNumber: 'SQ-98214',
						customerName: 'Rahul Sharma',
						customerPhoneMasked: '•••••• 4821',
						tableNumber: 'T-04',
						tokenNumber: 'TK-28',
						paymentMethod: 'UPI',
						upiVpa: 'customer@okhdfcbank',
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
					},
					refunds: [
						{
							id: 'refund-uuid-1',
							razorpayRefundId: 'rfnd_12345',
							amountPaise: 86800,
							currency: 'INR',
							status: 'PROCESSED',
							reason: 'Customer cancelled',
							processedAt: new Date('2026-10-27T14:20:00.000Z'),
							createdAt: new Date('2026-10-27T14:18:00.000Z'),
						},
					],
					createdAt: new Date('2026-10-27T14:15:00.000Z'),
					updatedAt: new Date('2026-10-27T14:15:03.000Z'),
				}),
			},
		};

		repository = new PrismaTransactionQueryRepository();
		(repository as unknown as { prisma: typeof mockPrisma }).prisma = mockPrisma;
	});

	describe('findTransactionsByRestaurant', () => {
		it('should strictly query by restaurantId with default pagination and sorting', async () => {
			const result = await repository.findTransactionsByRestaurant({
				restaurantId: mockRestaurantId,
				page: 1,
				limit: 20,
			});

			expect(mockPrisma.paymentTransaction.count).toHaveBeenCalledWith({
				where: { restaurantId: mockRestaurantId },
			});

			expect(mockPrisma.paymentTransaction.findMany).toHaveBeenCalledWith({
				where: { restaurantId: mockRestaurantId },
				orderBy: { createdAt: 'desc' },
				skip: 0,
				take: 20,
			});

			expect(result.transactions).toHaveLength(1);
			expect(result.transactions[0].amountPaise).toBe(86800);
			expect(result.pagination.totalPages).toBe(1);
			expect(result.pagination.totalRecords).toBe(1);
		});

		it('should apply status, amount range, date range, and method filters', async () => {
			await repository.findTransactionsByRestaurant({
				restaurantId: mockRestaurantId,
				page: 2,
				limit: 10,
				status: 'SUCCESS',
				method: 'UPI',
				startDate: '2026-10-01',
				endDate: '2026-10-31',
				minAmount: 1000,
				maxAmount: 100000,
				sortBy: 'amountPaise',
				sortOrder: 'asc',
			});

			expect(mockPrisma.paymentTransaction.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						restaurantId: mockRestaurantId,
						status: 'SUCCESS',
						amountPaise: { gte: 1000, lte: 100000 },
						metadata: { path: ['paymentMethod'], equals: 'UPI' },
						createdAt: {
							gte: new Date('2026-10-01T00:00:00.000Z'),
							lte: new Date('2026-10-31T23:59:59.999Z'),
						},
					}),
					orderBy: { amountPaise: 'asc' },
					skip: 10,
					take: 10,
				}),
			);
		});

		it('should build partial search across razorpayPaymentId, orderNumber, and customerName', async () => {
			await repository.findTransactionsByRestaurant({
				restaurantId: mockRestaurantId,
				page: 1,
				limit: 20,
				search: 'SQ-982',
			});

			expect(mockPrisma.paymentTransaction.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						restaurantId: mockRestaurantId,
						OR: [
							{ razorpayPaymentId: { contains: 'SQ-982', mode: 'insensitive' } },
							{ metadata: { path: ['orderNumber'], string_contains: 'SQ-982' } },
							{ metadata: { path: ['customerName'], string_contains: 'SQ-982' } },
						],
					}),
				}),
			);
		});
	});

	describe('findTransactionById', () => {
		it('should find single transaction scoping strictly by restaurantId', async () => {
			const result = await repository.findTransactionById(mockTxId, mockRestaurantId);

			expect(mockPrisma.paymentTransaction.findFirst).toHaveBeenCalledWith({
				where: { id: mockTxId, restaurantId: mockRestaurantId },
				include: {
					refunds: {
						orderBy: { createdAt: 'desc' },
						take: 1,
					},
				},
			});

			expect(result).not.toBeNull();
			expect(result?.id).toBe(mockTxId);
			expect(result?.customer.name).toBe('Rahul Sharma');
			expect(result?.billingBreakdown.grandTotalPaise).toBe(86800);
			expect(result?.refund?.razorpayRefundId).toBe('rfnd_12345');
		});

		it('should return null when transaction not found or belongs to another restaurant', async () => {
			mockPrisma.paymentTransaction.findFirst.mockResolvedValueOnce(null);

			const result = await repository.findTransactionById('other-tx', mockRestaurantId);

			expect(result).toBeNull();
		});
	});
});
