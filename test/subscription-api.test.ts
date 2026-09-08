import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import { Subscription } from '@domain/entities/subscription.entity.ts';
import { PlanBillingCycle, SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { databaseService } from '@infrastructure/database/index.ts';
import { bullmqService } from '@infrastructure/queue/index.ts';
import { redisService } from '@infrastructure/redis/index.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import request from 'supertest';
import app from '../src/app.ts';

const subscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(
	TYPES.Repositories.SubscriptionPlanRepository,
);
const subscriptionRepository = container.get<ISubscriptionRepository>(
	TYPES.Repositories.SubscriptionRepository,
);
const paymentTransactionRepository = container.get<IPaymentTransactionRepository>(
	TYPES.Repositories.PaymentTransactionRepository,
);
const razorpayGateway = container.get<IPaymentGateway>(TYPES.Gateways.PaymentGateway);

describe('Payment & Subscription API Routes (HTTP Integration)', () => {
	const mockPlan = new SubscriptionPlan({
		id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
		code: 'QUEUE_PRO',
		name: 'Queue Pro',
		description: 'Queue pro plan description',
		pricePaise: 149900,
		currency: 'INR',
		billingCycle: PlanBillingCycle.MONTHLY,
		features: ['Queue Management', 'SMS Alerts'],
		isActive: true,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(databaseService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(redisService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(razorpayGateway, 'isHealthy').mockReturnValue(true);
		jest.spyOn(bullmqService, 'isHealthy').mockResolvedValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await bullmqService.disconnect();
		await redisService.disconnect();
		await databaseService.disconnect();
	});

	describe('GET /plans', () => {
		it('should return 200 with list of subscription plans', async () => {
			jest.spyOn(subscriptionPlanRepository, 'findAllActive').mockResolvedValueOnce([mockPlan]);

			const res = await request(app).get('/plans').expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data).toHaveLength(1);
			expect(res.body.data[0].code).toBe('QUEUE_PRO');
			expect(res.body.data[0].priceInRupees).toBe(1499);
		});
	});

	describe('POST /subscriptions/order', () => {
		it('should return 201 when order is created successfully', async () => {
			jest.spyOn(subscriptionPlanRepository, 'findById').mockResolvedValueOnce(mockPlan);
			jest.spyOn(subscriptionRepository, 'findActiveByRestaurantId').mockResolvedValueOnce(null);
			jest
				.spyOn(paymentTransactionRepository, 'findPendingByRestaurantAndPlan')
				.mockResolvedValueOnce(null);
			jest.spyOn(razorpayGateway, 'createOrder').mockResolvedValueOnce({
				orderId: 'order_123456',
				amount: 149900,
				currency: 'INR',
				status: 'created',
			});
			jest.spyOn(paymentTransactionRepository, 'create').mockResolvedValueOnce(
				new PaymentTransaction({
					id: 'tx-1',
					restaurantId: 'r-123',
					planId: mockPlan.id,
					razorpayOrderId: 'order_123456',
					amountPaise: 149900,
					currency: 'INR',
					status: 'CREATED',
				}),
			);

			const res = await request(app)
				.post('/subscriptions/order')
				.set('x-restaurant-id', '33333333-3333-3333-3333-333333333333')
				.send({
					planId: mockPlan.id,
					restaurantName: 'Test Diner',
				})
				.expect(HTTP_STATUS.CREATED);

			expect(res.body.success).toBe(true);
			expect(res.body.data.orderId).toBe('order_123456');
			expect(res.body.data.amount).toBe(149900);
		});

		it('should return 401 if restaurant identification is missing', async () => {
			const res = await request(app)
				.post('/subscriptions/order')
				.send({
					planId: mockPlan.id,
				})
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
		});

		it('should return 422 if payload fails validation', async () => {
			const res = await request(app)
				.post('/subscriptions/order')
				.set('x-restaurant-id', '33333333-3333-3333-3333-333333333333')
				.send({
					planId: 'not-a-uuid',
				})
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('VALIDATION_ERROR');
		});
	});

	describe('POST /subscriptions/verify', () => {
		it('should return 400 if signature is invalid', async () => {
			jest.spyOn(razorpayGateway, 'verifyPaymentSignature').mockReturnValueOnce(false);

			const res = await request(app)
				.post('/subscriptions/verify')
				.set('x-restaurant-id', '33333333-3333-3333-3333-333333333333')
				.send({
					razorpayOrderId: 'order_123',
					razorpayPaymentId: 'pay_456',
					razorpaySignature: 'invalid_sig',
				})
				.expect(HTTP_STATUS.BAD_REQUEST);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('INVALID_PAYMENT_SIGNATURE');
		});
	});

	describe('GET /subscriptions/status', () => {
		it('should return 200 with active subscription details', async () => {
			const activeSub = new Subscription({
				id: 'sub-1',
				restaurantId: '33333333-3333-3333-3333-333333333333',
				planId: mockPlan.id,
				status: 'ACTIVE',
				currentPeriodStart: new Date(),
				currentPeriodEnd: new Date(Date.now() + 86400000 * 30),
			});

			jest
				.spyOn(subscriptionRepository, 'findActiveByRestaurantId')
				.mockResolvedValueOnce(activeSub);
			jest.spyOn(subscriptionPlanRepository, 'findById').mockResolvedValueOnce(mockPlan);

			const res = await request(app)
				.get('/subscriptions/status')
				.set('x-restaurant-id', '33333333-3333-3333-3333-333333333333')
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.isSubscriptionActive).toBe(true);
			expect(res.body.data.subscription.planCode).toBe('QUEUE_PRO');
		});

		it('should return isSubscriptionActive: false if restaurant has no active subscription', async () => {
			jest.spyOn(subscriptionRepository, 'findActiveByRestaurantId').mockResolvedValueOnce(null);

			const res = await request(app)
				.get('/subscriptions/status')
				.set('x-restaurant-id', '33333333-3333-3333-3333-333333333333')
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.isSubscriptionActive).toBe(false);
			expect(res.body.data.subscription).toBeNull();
		});
	});

	describe('POST /webhook', () => {
		it('should return 200 OK for valid webhook calls', async () => {
			const res = await request(app)
				.post('/webhook')
				.send({
					event: 'payment.captured',
					payload: {},
				})
				.expect(HTTP_STATUS.OK);

			expect(res.body.received).toBe(true);
		});

		it('should handle payment.failed event and mark transaction failed', async () => {
			const mockTx = new PaymentTransaction({
				id: 'tx-123',
				restaurantId: '33333333-3333-3333-3333-333333333333',
				planId: mockPlan.id,
				razorpayOrderId: 'order_failed_123',
				amountPaise: 149900,
				currency: 'INR',
				status: 'CREATED',
			});

			jest.spyOn(paymentTransactionRepository, 'findByOrderId').mockResolvedValueOnce(mockTx);
			const markFailedSpy = jest
				.spyOn(paymentTransactionRepository, 'markFailed')
				.mockResolvedValueOnce(mockTx);

			const res = await request(app)
				.post('/webhook')
				.send({
					event: 'payment.failed',
					payload: {
						payment: {
							entity: {
								id: 'pay_failed_123',
								order_id: 'order_failed_123',
								error_description: 'Payment was dropped by user',
							},
						},
					},
				})
				.expect(HTTP_STATUS.OK);

			expect(res.body.received).toBe(true);
			expect(markFailedSpy).toHaveBeenCalledWith('order_failed_123', 'Payment was dropped by user');
		});
	});
});
