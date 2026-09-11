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
import { SUBSCRIPTION_ROUTES } from '@shared/constants/routes.constants.ts';
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

	describe(`GET ${SUBSCRIPTION_ROUTES.PLANS}`, () => {
		it('should return 200 OK and list of available subscription plans', async () => {
			jest.spyOn(subscriptionPlanRepository, 'findAllActive').mockResolvedValueOnce([mockPlan]);

			const res = await request(app).get(SUBSCRIPTION_ROUTES.PLANS).expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data).toBeInstanceOf(Array);
			expect(res.body.data).toHaveLength(1);
			expect(res.body.data[0].code).toBe('QUEUE_PRO');
			expect(res.body.data[0].pricePaise).toBe(149900);
		});
	});

	describe(`POST ${SUBSCRIPTION_ROUTES.ORDER}`, () => {
		it('should create an order successfully with valid restaurant headers and payload', async () => {
			jest.spyOn(subscriptionPlanRepository, 'findById').mockResolvedValueOnce(mockPlan);
			jest.spyOn(subscriptionRepository, 'findActiveByRestaurantId').mockResolvedValueOnce(null);
			jest
				.spyOn(paymentTransactionRepository, 'findPendingByRestaurantAndPlan')
				.mockResolvedValueOnce(null);
			jest.spyOn(razorpayGateway, 'createOrder').mockResolvedValueOnce({
				orderId: 'order_test_123',
				amount: 149900,
				currency: 'INR',
				status: 'created',
			});

			const mockTx = new PaymentTransaction({
				id: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
				restaurantId: '11111111-1111-1111-1111-111111111111',
				planId: mockPlan.id,
				razorpayOrderId: 'order_test_123',
				amountPaise: 149900,
				currency: 'INR',
				status: 'CREATED',
			});
			jest.spyOn(paymentTransactionRepository, 'create').mockResolvedValueOnce(mockTx);

			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.ORDER)
				.set('x-restaurant-id', '11111111-1111-1111-1111-111111111111')
				.set('x-restaurant-name', 'Spicy Spoon')
				.set('x-user-email', 'owner@spicyspoon.com')
				.send({
					planId: mockPlan.id,
				})
				.expect(HTTP_STATUS.CREATED);

			expect(res.body.success).toBe(true);
			expect(res.body.data.orderId).toBe('order_test_123');
			expect(res.body.data.amount).toBe(149900);
		});

		it('should return 401 UNAUTHORIZED if restaurantId is completely missing', async () => {
			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.ORDER)
				.send({
					planId: mockPlan.id,
				})
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('UNAUTHORIZED');
		});

		it('should return 422 UNPROCESSABLE_ENTITY on invalid request body', async () => {
			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.ORDER)
				.set('x-restaurant-id', '11111111-1111-1111-1111-111111111111')
				.send({
					planId: 'invalid-not-a-uuid',
				})
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('VALIDATION_ERROR');
		});
	});

	describe(`POST ${SUBSCRIPTION_ROUTES.VERIFY}`, () => {
		it('should verify payment signature and activate subscription', async () => {
			jest.spyOn(razorpayGateway, 'verifyPaymentSignature').mockReturnValueOnce(true);

			const mockTx = new PaymentTransaction({
				id: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
				restaurantId: '11111111-1111-1111-1111-111111111111',
				planId: mockPlan.id,
				razorpayOrderId: 'order_test_123',
				amountPaise: 149900,
				currency: 'INR',
				status: 'CREATED',
			});
			jest.spyOn(paymentTransactionRepository, 'findByOrderId').mockResolvedValueOnce(mockTx);
			jest.spyOn(subscriptionPlanRepository, 'findById').mockResolvedValueOnce(mockPlan);

			const now = new Date();
			const periodEnd = new Date(now);
			periodEnd.setDate(periodEnd.getDate() + 30);

			const mockSub = new Subscription({
				id: 'sub-12345',
				restaurantId: '11111111-1111-1111-1111-111111111111',
				planId: mockPlan.id,
				status: 'ACTIVE',
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
			});
			jest
				.spyOn(subscriptionRepository, 'activateSubscriptionWithOutbox')
				.mockResolvedValueOnce(mockSub);

			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.VERIFY)
				.set('x-restaurant-id', '11111111-1111-1111-1111-111111111111')
				.send({
					razorpayOrderId: 'order_test_123',
					razorpayPaymentId: 'pay_test_456',
					razorpaySignature: 'valid_signature_abc',
				})
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.status).toBe('ACTIVE');
			expect(res.body.data.subscriptionId).toBe('sub-12345');
		});

		it('should return 400 BAD_REQUEST on invalid signature', async () => {
			jest.spyOn(razorpayGateway, 'verifyPaymentSignature').mockReturnValueOnce(false);

			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.VERIFY)
				.set('x-restaurant-id', '11111111-1111-1111-1111-111111111111')
				.send({
					razorpayOrderId: 'order_test_123',
					razorpayPaymentId: 'pay_test_456',
					razorpaySignature: 'tampered_signature',
				})
				.expect(HTTP_STATUS.BAD_REQUEST);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('INVALID_PAYMENT_SIGNATURE');
		});
	});

	describe(`GET ${SUBSCRIPTION_ROUTES.STATUS}/:restaurantId`, () => {
		it('should return 200 OK and active subscription status', async () => {
			const now = new Date();
			const periodEnd = new Date(now);
			periodEnd.setDate(periodEnd.getDate() + 30);

			const mockSub = new Subscription({
				id: 'sub-active-99',
				restaurantId: '22222222-2222-2222-2222-222222222222',
				planId: mockPlan.id,
				status: 'ACTIVE',
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
			});

			jest.spyOn(subscriptionRepository, 'findActiveByRestaurantId').mockResolvedValueOnce(mockSub);
			jest.spyOn(subscriptionPlanRepository, 'findById').mockResolvedValueOnce(mockPlan);

			const res = await request(app)
				.get(`${SUBSCRIPTION_ROUTES.STATUS}/22222222-2222-2222-2222-222222222222`)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.isSubscriptionActive).toBe(true);
			expect(res.body.data.subscription.id).toBe('sub-active-99');
			expect(res.body.data.subscription.planCode).toBe('QUEUE_PRO');
		});

		it('should return 200 OK with isSubscriptionActive: false if no active subscription exists', async () => {
			jest.spyOn(subscriptionRepository, 'findActiveByRestaurantId').mockResolvedValueOnce(null);

			const res = await request(app)
				.get(`${SUBSCRIPTION_ROUTES.STATUS}/22222222-2222-2222-2222-222222222222`)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.isSubscriptionActive).toBe(false);
			expect(res.body.data.subscription).toBeNull();
		});
	});

	describe(`POST ${SUBSCRIPTION_ROUTES.WEBHOOK}`, () => {
		it('should return 200 OK for valid webhook calls', async () => {
			jest.spyOn(razorpayGateway, 'verifyWebhookSignature').mockReturnValue(true);

			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.WEBHOOK)
				.set('x-razorpay-signature', 'valid_test_signature')
				.send({
					event: 'payment.captured',
					payload: {},
				})
				.expect(HTTP_STATUS.OK);

			expect(res.body.received).toBe(true);
		});

		it('should handle payment.failed event and mark transaction failed', async () => {
			jest.spyOn(razorpayGateway, 'verifyWebhookSignature').mockReturnValue(true);

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
				.post(SUBSCRIPTION_ROUTES.WEBHOOK)
				.set('x-razorpay-signature', 'valid_test_signature')
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

		it('should reject webhook with received: false when signature is invalid or missing', async () => {
			jest.spyOn(razorpayGateway, 'verifyWebhookSignature').mockReturnValue(false);

			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.WEBHOOK)
				.send({
					event: 'payment.captured',
					payload: {},
				})
				.expect(HTTP_STATUS.OK);

			expect(res.body.received).toBe(false);
		});
	});
});
