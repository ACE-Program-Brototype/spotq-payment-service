import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import { config } from '@config/index.ts';
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import { BillingInvoice } from '@domain/entities/billing-invoice.entity.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import { Subscription } from '@domain/entities/subscription.entity.ts';
import { PlanBillingCycle, SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IBillingInvoiceRepository } from '@domain/repositories/billing-invoice.repository.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { databaseService } from '@infrastructure/database/index.ts';
import { bullmqService } from '@infrastructure/queue/index.ts';
import { redisService } from '@infrastructure/redis/index.ts';
import { redisClient } from '@infrastructure/redis/redis.client.ts';
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
const billingInvoiceRepository = container.get<IBillingInvoiceRepository>(
	TYPES.Repositories.BillingInvoiceRepository,
);
const restaurantWalletRepository = container.get<IRestaurantWalletRepository>(
	TYPES.Repositories.RestaurantWalletRepository,
);
const razorpayGateway = container.get<IPaymentGateway>(TYPES.Gateways.PaymentGateway);
const outboxRelayService = container.get<IOutboxRelayService>(TYPES.Services.OutboxRelayService);

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

	const redisStore = new Map<string, string>();

	beforeEach(() => {
		jest.clearAllMocks();
		redisStore.clear();
		Object.defineProperty(redisClient, 'isOpen', {
			value: true,
			writable: true,
			configurable: true,
		});
		jest.spyOn(redisClient, 'set').mockImplementation(async (key, value, options?: unknown) => {
			const strKey = String(key);
			const setOptions = options as { NX?: boolean; EX?: number } | undefined;
			if (setOptions?.NX && redisStore.has(strKey)) {
				return null;
			}
			redisStore.set(strKey, String(value));
			return 'OK';
		});
		jest.spyOn(redisClient, 'get').mockImplementation(async (key) => {
			return redisStore.get(String(key)) ?? null;
		});
		jest.spyOn(redisClient, 'eval').mockImplementation(async (script, options?: unknown) => {
			const evalOptions = options as { keys: string[]; arguments: string[] } | undefined;
			const key = String(evalOptions?.keys?.[0] ?? '');
			const token = String(evalOptions?.arguments?.[0] ?? '');
			const current = redisStore.get(key);
			if (!current) {
				return 0;
			}
			if (String(script).includes('string.find')) {
				if (current.includes(token)) {
					redisStore.delete(key);
					return 1;
				}
				return 0;
			}
			if (current === token) {
				redisStore.delete(key);
				return 1;
			}
			return 0;
		});
		jest.spyOn(databaseService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(redisService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(razorpayGateway, 'isHealthy').mockReturnValue(true);
		jest.spyOn(bullmqService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(outboxRelayService, 'processPendingEvents').mockResolvedValue();
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
			jest.spyOn(billingInvoiceRepository, 'create').mockResolvedValueOnce(
				new BillingInvoice({
					id: 'inv-123',
					restaurantId: '11111111-1111-1111-1111-111111111111',
					subscriptionId: null,
					paymentTransactionId: mockTx.id,
					invoiceNumber: 'INV-TEST-1',
					amountPaise: 149900,
					currency: 'INR',
					status: 'DRAFT',
					paidAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			);

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

	describe('POST Subscription Renewal Routes', () => {
		const targetSubId = '22222222-2222-4222-8222-222222222222';
		const restId = '11111111-1111-4111-8111-111111111111';

		it('should return 401 UNAUTHORIZED if auth headers are missing', async () => {
			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.send({})
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('UNAUTHORIZED');
		});

		it('should return 403 FORBIDDEN if user role is not authorized', async () => {
			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'CUSTOMER')
				.send({})
				.expect(HTTP_STATUS.FORBIDDEN);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('FORBIDDEN');
		});

		it('should return 422 UNPROCESSABLE_ENTITY if subscriptionId is not a valid UUID', async () => {
			const res = await request(app)
				.post('/subscriptions/not-a-valid-uuid/renew')
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.send({})
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('VALIDATION_ERROR');
		});

		it('should return 422 UNPROCESSABLE_ENTITY when Idempotency-Key header is missing', async () => {
			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.send({})
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('VALIDATION_ERROR');
		});

		it('should return 422 UNPROCESSABLE_ENTITY when Idempotency-Key header is malformed', async () => {
			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'bad key!')
				.send({})
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('VALIDATION_ERROR');
		});

		it('should return 422 UNPROCESSABLE_ENTITY when unknown fields are sent in request body (.strict())', async () => {
			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'idem-api-strict-0001')
				.send({ unexpectedField: 'not-allowed' })
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('VALIDATION_ERROR');
		});

		it('should return 403 FORBIDDEN when Restaurant Admin attempts to renew another restaurant subscription', async () => {
			const foreignSub = new Subscription({
				id: targetSubId,
				restaurantId: '99999999-9999-4999-8999-999999999999',
				planId: mockPlan.id,
				status: 'EXPIRED',
				currentPeriodStart: new Date(Date.now() - 60 * 86400000),
				currentPeriodEnd: new Date(Date.now() - 5 * 86400000),
			});
			jest.spyOn(subscriptionRepository, 'findById').mockResolvedValueOnce(foreignSub);

			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'idem-api-forbidden-0001')
				.send({})
				.expect(HTTP_STATUS.FORBIDDEN);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('FORBIDDEN_SUBSCRIPTION_ACCESS');
		});

		it('should return 404 NOT_FOUND if subscription does not exist', async () => {
			jest.spyOn(subscriptionRepository, 'findById').mockResolvedValueOnce(null);

			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'idem-api-notfound-0001')
				.send({})
				.expect(HTTP_STATUS.NOT_FOUND);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('SUBSCRIPTION_NOT_FOUND');
		});

		it('should return 409 CONFLICT if subscription is active and has > 30 days remaining', async () => {
			const activeFarSub = new Subscription({
				id: targetSubId,
				restaurantId: restId,
				planId: mockPlan.id,
				status: 'ACTIVE',
				currentPeriodStart: new Date(),
				currentPeriodEnd: new Date(Date.now() + 50 * 86400000),
			});
			jest.spyOn(subscriptionRepository, 'findById').mockResolvedValueOnce(activeFarSub);

			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'idem-api-far-0001')
				.send({})
				.expect(HTTP_STATUS.CONFLICT);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('SUBSCRIPTION_NOT_ELIGIBLE_FOR_RENEWAL');
		});

		it('should return 503 SERVICE_UNAVAILABLE when payment gateway is unhealthy', async () => {
			const expiredSub = new Subscription({
				id: targetSubId,
				restaurantId: restId,
				planId: mockPlan.id,
				status: 'EXPIRED',
				currentPeriodStart: new Date(Date.now() - 60 * 86400000),
				currentPeriodEnd: new Date(Date.now() - 5 * 86400000),
			});
			jest.spyOn(subscriptionRepository, 'findById').mockResolvedValueOnce(expiredSub);
			jest.spyOn(subscriptionPlanRepository, 'findById').mockResolvedValueOnce(mockPlan);
			jest
				.spyOn(paymentTransactionRepository, 'findPendingRenewalBySubscriptionAndPlan')
				.mockResolvedValueOnce(null);
			jest.spyOn(razorpayGateway, 'isHealthy').mockReturnValueOnce(false);

			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'idem-api-unhealthy-0001')
				.send({})
				.expect(HTTP_STATUS.SERVICE_UNAVAILABLE);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('PAYMENT_GATEWAY_UNAVAILABLE');
		});

		it('should return 503 SERVICE_UNAVAILABLE when Redis idempotency storage is unavailable', async () => {
			Object.defineProperty(redisClient, 'isOpen', {
				value: false,
				writable: true,
				configurable: true,
			});

			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'idem-api-redis-down-0001')
				.send({})
				.expect(HTTP_STATUS.SERVICE_UNAVAILABLE);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('IDEMPOTENCY_STORAGE_UNAVAILABLE');
		});

		it('should create renewal order with 201 CREATED, replay duplicate Idempotency-Key, and reject payload mismatch with 409', async () => {
			const expiredSub = new Subscription({
				id: targetSubId,
				restaurantId: restId,
				planId: mockPlan.id,
				status: 'EXPIRED',
				currentPeriodStart: new Date(Date.now() - 60 * 86400000),
				currentPeriodEnd: new Date(Date.now() - 5 * 86400000),
			});
			jest.spyOn(subscriptionRepository, 'findById').mockResolvedValueOnce(expiredSub);
			jest.spyOn(subscriptionPlanRepository, 'findById').mockResolvedValueOnce(mockPlan);
			jest
				.spyOn(paymentTransactionRepository, 'findPendingRenewalBySubscriptionAndPlan')
				.mockResolvedValueOnce(null);
			const createOrderSpy = jest.spyOn(razorpayGateway, 'createOrder').mockResolvedValueOnce({
				orderId: 'order_renew_api_123',
				amount: 149900,
				currency: 'INR',
				status: 'created',
			});

			const mockRenewTx = new PaymentTransaction({
				id: 'tx-renew-api-1',
				restaurantId: restId,
				subscriptionId: targetSubId,
				planId: mockPlan.id,
				razorpayOrderId: 'order_renew_api_123',
				amountPaise: 149900,
				currency: 'INR',
				status: 'CREATED',
			});
			jest.spyOn(paymentTransactionRepository, 'create').mockResolvedValueOnce(mockRenewTx);
			jest
				.spyOn(paymentTransactionRepository, 'createRenewalWithInvoice')
				.mockResolvedValueOnce(mockRenewTx);
			jest.spyOn(billingInvoiceRepository, 'create').mockResolvedValueOnce(
				new BillingInvoice({
					id: 'inv-renew-1',
					restaurantId: restId,
					subscriptionId: targetSubId,
					paymentTransactionId: mockRenewTx.id,
					invoiceNumber: 'INV-RENEW-1',
					amountPaise: 149900,
					currency: 'INR',
					status: 'DRAFT',
					paidAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			);

			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'idem-api-success-0001')
				.send({})
				.expect(HTTP_STATUS.CREATED);

			expect(res.body.success).toBe(true);
			expect(res.headers['idempotency-replayed']).toBeUndefined();
			expect(res.body.data.orderId).toBe('order_renew_api_123');
			expect(res.body.data.amount).toBe(149900);
			expect(res.body.data.subscription.id).toBe(targetSubId);

			const replayedRes = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'idem-api-success-0001')
				.send({})
				.expect(HTTP_STATUS.CREATED);

			expect(replayedRes.headers['idempotency-replayed']).toBe('true');
			expect(replayedRes.body.data.orderId).toBe('order_renew_api_123');
			expect(createOrderSpy).toHaveBeenCalledTimes(1);

			const mismatchRes = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'idem-api-success-0001')
				.send({ planId: '44444444-4444-4444-8444-444444444444' })
				.expect(HTTP_STATUS.CONFLICT);

			expect(mismatchRes.body.error).toBe('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
		});

		it('should succeed on renewal endpoint /subscriptions/:subscriptionId/renew with active expiring subscription', async () => {
			const activeExpiringSub = new Subscription({
				id: targetSubId,
				restaurantId: restId,
				planId: mockPlan.id,
				status: 'ACTIVE',
				currentPeriodStart: new Date(Date.now() - 20 * 86400000),
				currentPeriodEnd: new Date(Date.now() + 5 * 86400000),
			});
			jest.spyOn(subscriptionRepository, 'findById').mockResolvedValueOnce(activeExpiringSub);
			jest.spyOn(subscriptionPlanRepository, 'findById').mockResolvedValueOnce(mockPlan);
			jest
				.spyOn(paymentTransactionRepository, 'findPendingRenewalBySubscriptionAndPlan')
				.mockResolvedValueOnce(null);
			jest.spyOn(razorpayGateway, 'createOrder').mockResolvedValueOnce({
				orderId: 'order_renew_v1_123',
				amount: 149900,
				currency: 'INR',
				status: 'created',
			});

			const mockRenewTx = new PaymentTransaction({
				id: 'tx-renew-v1-1',
				restaurantId: restId,
				subscriptionId: targetSubId,
				planId: mockPlan.id,
				razorpayOrderId: 'order_renew_v1_123',
				amountPaise: 149900,
				currency: 'INR',
				status: 'CREATED',
			});
			jest.spyOn(paymentTransactionRepository, 'create').mockResolvedValueOnce(mockRenewTx);
			jest
				.spyOn(paymentTransactionRepository, 'createRenewalWithInvoice')
				.mockResolvedValueOnce(mockRenewTx);
			jest.spyOn(billingInvoiceRepository, 'create').mockResolvedValueOnce(
				new BillingInvoice({
					id: 'inv-renew-2',
					restaurantId: restId,
					subscriptionId: targetSubId,
					paymentTransactionId: mockRenewTx.id,
					invoiceNumber: 'INV-RENEW-2',
					amountPaise: 149900,
					currency: 'INR',
					status: 'DRAFT',
					paidAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			);

			const res = await request(app)
				.post(`/subscriptions/${targetSubId}/renew`)
				.set('x-restaurant-id', restId)
				.set('x-user-id', restId)
				.set('x-user-role', 'RESTAURANT_OWNER')
				.set('Idempotency-Key', 'idem-api-v1-0001')
				.send({})
				.expect(HTTP_STATUS.CREATED);

			expect(res.body.success).toBe(true);
			expect(res.body.data.orderId).toBe('order_renew_v1_123');
			expect(res.body.data.subscription.id).toBe(targetSubId);
		});
	});

	describe(`POST ${SUBSCRIPTION_ROUTES.VERIFY}`, () => {
		it('should verify payment signature and activate subscription', async () => {
			jest.spyOn(razorpayGateway, 'verifyPaymentSignature').mockReturnValueOnce(true);
			jest.spyOn(restaurantWalletRepository, 'findByRestaurantId').mockResolvedValueOnce(null);
			jest
				.spyOn(restaurantWalletRepository, 'create')
				.mockImplementationOnce(async (wallet) => wallet);

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
		let originalWebhookSecret: string | undefined;

		beforeEach(() => {
			originalWebhookSecret = config.razorpay.webhookSecret;
			Object.assign(config.razorpay, { webhookSecret: 'test-webhook-secret' });
		});

		afterEach(() => {
			Object.assign(config.razorpay, { webhookSecret: originalWebhookSecret });
		});

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

			expect(res.body.success).toBe(true);
			expect(res.body.data.received).toBe(true);
			expect(razorpayGateway.verifyWebhookSignature).toHaveBeenCalledWith(
				expect.any(String),
				'valid_test_signature',
				'test-webhook-secret',
			);
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

			expect(res.body.success).toBe(true);
			expect(res.body.data.received).toBe(true);
			expect(razorpayGateway.verifyWebhookSignature).toHaveBeenCalledWith(
				expect.any(String),
				'valid_test_signature',
				'test-webhook-secret',
			);
			expect(markFailedSpy).toHaveBeenCalledWith('order_failed_123', 'Payment was dropped by user');
		});

		it('should reject webhook with received: false when signature is invalid or missing', async () => {
			jest.spyOn(razorpayGateway, 'verifyWebhookSignature').mockReturnValue(false);

			const missingSignatureResponse = await request(app)
				.post(SUBSCRIPTION_ROUTES.WEBHOOK)
				.send({
					event: 'payment.captured',
					payload: {},
				})
				.expect(HTTP_STATUS.OK);

			expect(missingSignatureResponse.body.success).toBe(true);
			expect(missingSignatureResponse.body.data.received).toBe(false);

			const invalidSignatureResponse = await request(app)
				.post(SUBSCRIPTION_ROUTES.WEBHOOK)
				.set('x-razorpay-signature', 'invalid-signature')
				.send({
					event: 'payment.captured',
					payload: {},
				})
				.expect(HTTP_STATUS.OK);

			expect(invalidSignatureResponse.body.success).toBe(true);
			expect(invalidSignatureResponse.body.data.received).toBe(false);
			expect(razorpayGateway.verifyWebhookSignature).toHaveBeenCalledTimes(1);
			expect(razorpayGateway.verifyWebhookSignature).toHaveBeenCalledWith(
				expect.any(String),
				'invalid-signature',
				'test-webhook-secret',
			);
		});
	});
});
