import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import { env } from '@config/env.ts';
import { config } from '@config/index.ts';
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { DatabaseService } from '@infrastructure/database/index.ts';
import type { BullMQService } from '@infrastructure/queue/index.ts';
import type { RabbitMQService } from '@infrastructure/rabbitmq/index.ts';
import type { RedisService } from '@infrastructure/redis/index.ts';
import { S2S_CALLER_SERVICES } from '@shared/constants/auth.constants.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import { ORDER_PAYMENT_ROUTES, SUBSCRIPTION_ROUTES } from '@shared/constants/routes.constants.ts';
import { generateToken } from '@spotq-org/s2s-core';
import request from 'supertest';
import app from '../src/app.ts';

const paymentTransactionRepository = container.get<IPaymentTransactionRepository>(
	TYPES.Repositories.PaymentTransactionRepository,
);
const razorpayGateway = container.get<IPaymentGateway>(TYPES.Gateways.PaymentGateway);
const outboxRelayService = container.get<IOutboxRelayService>(TYPES.Services.OutboxRelayService);
const rabbitMQService = container.get<RabbitMQService>(TYPES.Services.RabbitMQService);
const databaseService = container.get<DatabaseService>(TYPES.Services.DatabaseService);
const redisService = container.get<RedisService>(TYPES.Services.RedisService);
const bullmqService = container.get<BullMQService>(TYPES.Services.BullMQService);

describe('Customer Order Payment Initiation, Signature Verification & Status API (SCRUM-13)', () => {
	const mockOrderId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
	const mockCustomerId = '10101010-1010-4010-a010-101010101010';
	const mockRestaurantId = '20202020-2020-4020-a020-202020202020';
	const mockRazorpayOrderId = 'order_EK98a123cd45';
	const mockRazorpayPaymentId = 'pay_EK98b987ef65';
	const mockSignature = '2f4b3a1c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a';

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(databaseService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(redisService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(razorpayGateway, 'isHealthy').mockReturnValue(true);
		jest.spyOn(bullmqService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(rabbitMQService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(outboxRelayService, 'processPendingEvents').mockResolvedValue();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('AC1: Internal S2S Gateway Order Creation', () => {
		const validPayload = {
			orderId: mockOrderId,
			customerId: mockCustomerId,
			restaurantId: mockRestaurantId,
			amountPaise: 45000,
			currency: 'INR',
		};

		const getValidS2SToken = () =>
			generateToken(env.S2S_AUDIENCE, {
				serviceName: S2S_CALLER_SERVICES.ORDER_SERVICE,
				privateKey: env.S2S_PRIVATE_KEY,
			});

		it('should return 401 UNAUTHORIZED when Authorization header is missing', async () => {
			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.CREATE_GATEWAY_ORDER)
				.set('x-caller-service', S2S_CALLER_SERVICES.ORDER_SERVICE)
				.send(validPayload)
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
		});

		it('should return 401 UNAUTHORIZED when token is invalid or malformed', async () => {
			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.CREATE_GATEWAY_ORDER)
				.set('Authorization', 'Bearer invalid.token.value')
				.set('x-caller-service', S2S_CALLER_SERVICES.ORDER_SERVICE)
				.send(validPayload)
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
		});

		it('should return 401 UNAUTHORIZED when x-caller-service header is missing', async () => {
			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.CREATE_GATEWAY_ORDER)
				.set('Authorization', `Bearer ${getValidS2SToken()}`)
				.send(validPayload)
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
		});

		it('should create gateway order successfully on /api/internal/v1/payments/orders (201 Created)', async () => {
			jest.spyOn(paymentTransactionRepository, 'findByCustomerOrderId').mockResolvedValueOnce(null);
			jest.spyOn(razorpayGateway, 'createOrder').mockResolvedValueOnce({
				orderId: mockRazorpayOrderId,
				amount: 45000,
				currency: 'INR',
				status: 'created',
				receipt: 'ord_9b1deb4d3b7d4bad9bdd2b0d7b',
			});

			const mockCreatedTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CREATED',
				createdAt: new Date('2026-10-27T00:00:00.000Z'),
			});

			jest.spyOn(paymentTransactionRepository, 'create').mockResolvedValueOnce(mockCreatedTx);

			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.CREATE_GATEWAY_ORDER)
				.set('Authorization', `Bearer ${getValidS2SToken()}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.ORDER_SERVICE)
				.send(validPayload)
				.expect(HTTP_STATUS.CREATED);

			expect(res.body.success).toBe(true);
			expect(res.body.data).toEqual(
				expect.objectContaining({
					paymentId: 'pay-txn-uuid-001',
					orderId: mockOrderId,
					razorpayOrderId: mockRazorpayOrderId,
					amountPaise: 45000,
					currency: 'INR',
					keyId: expect.any(String),
				}),
			);
		});

		it('should return existing gateway order idempotently when already in CREATED state without recreating Razorpay order', async () => {
			const existingPendingTx = new PaymentTransaction({
				id: 'pay-txn-uuid-existing',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: 'order_existing_123',
				amountPaise: 45000,
				currency: 'INR',
				status: 'CREATED',
				createdAt: new Date('2026-10-27T00:00:00.000Z'),
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByCustomerOrderId')
				.mockResolvedValueOnce(existingPendingTx);
			const createOrderSpy = jest.spyOn(razorpayGateway, 'createOrder');

			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.CREATE_GATEWAY_ORDER)
				.set('Authorization', `Bearer ${getValidS2SToken()}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.ORDER_SERVICE)
				.send(validPayload)
				.expect(HTTP_STATUS.CREATED);

			expect(res.body.success).toBe(true);
			expect(res.body.data).toEqual(
				expect.objectContaining({
					paymentId: 'pay-txn-uuid-existing',
					orderId: mockOrderId,
					razorpayOrderId: 'order_existing_123',
					amountPaise: 45000,
					currency: 'INR',
					keyId: expect.any(String),
				}),
			);
			expect(createOrderSpy).not.toHaveBeenCalled();
		});

		it('should create a new gateway order instead of reusing previous pending transaction if order amount changed', async () => {
			const previousLowerAmountTx = new PaymentTransaction({
				id: 'pay-txn-uuid-previous-lower',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: 'order_previous_123',
				amountPaise: 30000, // old amount 300
				currency: 'INR',
				status: 'CREATED',
				createdAt: new Date('2026-10-27T00:00:00.000Z'),
			});

			const newCreatedTx = new PaymentTransaction({
				id: 'pay-txn-uuid-new-higher',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: 'order_new_450',
				amountPaise: 45000, // new amount 450
				currency: 'INR',
				status: 'CREATED',
				createdAt: new Date('2026-10-27T00:01:00.000Z'),
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByCustomerOrderId')
				.mockResolvedValueOnce(previousLowerAmountTx);
			const createOrderSpy = jest.spyOn(razorpayGateway, 'createOrder').mockResolvedValueOnce({
				orderId: 'order_new_450',
				amount: 45000,
				currency: 'INR',
				receipt: 'ord_rcpt_1',
				status: 'created',
			});
			jest.spyOn(paymentTransactionRepository, 'create').mockResolvedValueOnce(newCreatedTx);

			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.CREATE_GATEWAY_ORDER)
				.set('Authorization', `Bearer ${getValidS2SToken()}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.ORDER_SERVICE)
				.send(validPayload)
				.expect(HTTP_STATUS.CREATED);

			expect(res.body.success).toBe(true);
			expect(res.body.data.razorpayOrderId).toBe('order_new_450');
			expect(createOrderSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					amountInPaise: 45000,
				}),
			);
		});

		it('should return 409 CONFLICT when order payment is already captured', async () => {
			const alreadyCapturedTx = new PaymentTransaction({
				id: 'pay-txn-uuid-captured',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: 'order_captured_123',
				amountPaise: 45000,
				currency: 'INR',
				status: 'CAPTURED',
				createdAt: new Date('2026-10-27T00:00:00.000Z'),
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByCustomerOrderId')
				.mockResolvedValueOnce(alreadyCapturedTx);
			const createOrderSpy = jest.spyOn(razorpayGateway, 'createOrder');

			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.CREATE_GATEWAY_ORDER)
				.set('Authorization', `Bearer ${getValidS2SToken()}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.ORDER_SERVICE)
				.send(validPayload)
				.expect(HTTP_STATUS.CONFLICT);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('PAYMENT_ALREADY_PROCESSED');
			expect(createOrderSpy).not.toHaveBeenCalled();
		});

		it('should return 422 UNPROCESSABLE_ENTITY on invalid request body', async () => {
			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.CREATE_GATEWAY_ORDER)
				.set('Authorization', `Bearer ${getValidS2SToken()}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.ORDER_SERVICE)
				.send({
					orderId: 'invalid-not-uuid',
					amountPaise: -50,
				})
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('VALIDATION_ERROR');
		});
	});

	describe('AC2 & AC6: Customer Payment Verification (Fast Path)', () => {
		const validVerifyPayload = {
			orderId: mockOrderId,
			razorpayOrderId: mockRazorpayOrderId,
			razorpayPaymentId: mockRazorpayPaymentId,
			razorpaySignature: mockSignature,
		};

		it('should return 401 UNAUTHORIZED when x-user-id header is missing on verify', async () => {
			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.VERIFY)
				.send(validVerifyPayload)
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('UNAUTHORIZED');
			expect(res.body.message).toBe('Customer authentication required');
		});

		it('should verify signature timing-safely, update status to CAPTURED and write outbox event (200 OK)', async () => {
			const mockPendingTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CREATED',
			});

			const mockCapturedTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				razorpayPaymentId: mockRazorpayPaymentId,
				razorpaySignature: mockSignature,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CAPTURED',
				updatedAt: new Date('2026-10-27T00:01:15.000Z'),
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByOrderId')
				.mockResolvedValueOnce(mockPendingTx);
			jest.spyOn(razorpayGateway, 'verifyPaymentSignature').mockReturnValueOnce(true);
			const captureSpy = jest
				.spyOn(paymentTransactionRepository, 'captureOrderPaymentWithOutbox')
				.mockResolvedValueOnce(mockCapturedTx);

			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.VERIFY)
				.set('x-user-id', mockCustomerId)
				.send(validVerifyPayload)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data).toEqual(
				expect.objectContaining({
					paymentId: 'pay-txn-uuid-001',
					orderId: mockOrderId,
					gatewayPaymentId: mockRazorpayPaymentId,
					status: 'CAPTURED',
					verifiedAt: expect.any(String),
				}),
			);

			expect(captureSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					transaction: expect.any(PaymentTransaction),
					outbox: expect.objectContaining({
						eventType: 'payment.order.captured',
						aggregateId: mockOrderId,
						payload: expect.objectContaining({
							paymentId: 'pay-txn-uuid-001',
							orderId: mockOrderId,
							amountPaise: 45000,
						}),
					}),
				}),
			);
		});

		it('should return 400 BAD_REQUEST on invalid HMAC signature', async () => {
			const mockPendingTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CREATED',
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByOrderId')
				.mockResolvedValueOnce(mockPendingTx);
			jest.spyOn(razorpayGateway, 'verifyPaymentSignature').mockReturnValueOnce(false);

			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.VERIFY)
				.set('x-user-id', mockCustomerId)
				.send(validVerifyPayload)
				.expect(HTTP_STATUS.BAD_REQUEST);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('INVALID_PAYMENT_SIGNATURE');
		});

		it('should return 404 NOT_FOUND if order is not found', async () => {
			jest.spyOn(paymentTransactionRepository, 'findByOrderId').mockResolvedValueOnce(null);

			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.VERIFY)
				.set('x-user-id', mockCustomerId)
				.send(validVerifyPayload)
				.expect(HTTP_STATUS.NOT_FOUND);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('PAYMENT_ORDER_NOT_FOUND');
		});

		it('should return 404 NOT_FOUND if transaction orderId does not match request orderId', async () => {
			const mismatchTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: 'other-order-id-not-matching',
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CREATED',
			});

			jest.spyOn(paymentTransactionRepository, 'findByOrderId').mockResolvedValueOnce(mismatchTx);

			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.VERIFY)
				.set('x-user-id', mockCustomerId)
				.send(validVerifyPayload)
				.expect(HTTP_STATUS.NOT_FOUND);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('PAYMENT_ORDER_NOT_FOUND');
		});
	});

	describe('AC5: Idempotency between Verify API and Webhook', () => {
		it('should return 200 OK immediately if transaction is already CAPTURED without creating duplicate outbox event', async () => {
			const alreadyCapturedTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				razorpayPaymentId: mockRazorpayPaymentId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CAPTURED',
				updatedAt: new Date('2026-10-27T00:01:15.000Z'),
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByOrderId')
				.mockResolvedValueOnce(alreadyCapturedTx);
			const captureSpy = jest.spyOn(paymentTransactionRepository, 'captureOrderPaymentWithOutbox');

			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.VERIFY)
				.set('x-user-id', mockCustomerId)
				.send({
					orderId: mockOrderId,
					razorpayOrderId: mockRazorpayOrderId,
					razorpayPaymentId: mockRazorpayPaymentId,
					razorpaySignature: mockSignature,
				})
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.status).toBe('CAPTURED');
			expect(captureSpy).not.toHaveBeenCalled();
		});

		it('should acknowledge webhook for already captured food order transaction without re-capturing', async () => {
			jest.spyOn(razorpayGateway, 'verifyWebhookSignature').mockReturnValue(true);

			const alreadyCapturedTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CAPTURED',
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByOrderId')
				.mockResolvedValueOnce(alreadyCapturedTx);
			const captureSpy = jest.spyOn(paymentTransactionRepository, 'captureOrderPaymentWithOutbox');

			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.WEBHOOK)
				.set('x-razorpay-signature', 'valid_sig')
				.send({
					event: 'payment.captured',
					payload: {
						payment: {
							entity: {
								id: mockRazorpayPaymentId,
								order_id: mockRazorpayOrderId,
								method: 'UPI',
							},
						},
					},
				})
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.received).toBe(true);
			expect(captureSpy).not.toHaveBeenCalled();
		});
	});

	describe('AC3 & AC4: Razorpay Webhook Event Processing (Safety Net)', () => {
		it('should capture food order transaction asynchronously on payment.captured webhook when client disconnected (AC3)', async () => {
			jest.spyOn(razorpayGateway, 'verifyWebhookSignature').mockReturnValue(true);

			const pendingTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CREATED',
			});

			const capturedTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CAPTURED',
			});

			jest.spyOn(paymentTransactionRepository, 'findByOrderId').mockResolvedValueOnce(pendingTx);
			const captureSpy = jest
				.spyOn(paymentTransactionRepository, 'captureOrderPaymentWithOutbox')
				.mockResolvedValueOnce(capturedTx);

			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.WEBHOOK)
				.set('x-razorpay-signature', 'valid_sig')
				.send({
					event: 'payment.captured',
					payload: {
						payment: {
							entity: {
								id: mockRazorpayPaymentId,
								order_id: mockRazorpayOrderId,
								method: 'UPI',
							},
						},
					},
				})
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.received).toBe(true);
			expect(captureSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					transaction: expect.any(PaymentTransaction),
					outbox: expect.objectContaining({
						eventType: 'payment.order.captured',
						aggregateId: mockOrderId,
					}),
				}),
			);
		});

		it('should capture food order transaction on order.paid webhook', async () => {
			jest.spyOn(razorpayGateway, 'verifyWebhookSignature').mockReturnValue(true);

			const pendingTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CREATED',
			});

			jest.spyOn(paymentTransactionRepository, 'findByOrderId').mockResolvedValueOnce(pendingTx);
			const captureSpy = jest
				.spyOn(paymentTransactionRepository, 'captureOrderPaymentWithOutbox')
				.mockResolvedValueOnce(pendingTx);

			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.WEBHOOK)
				.set('x-razorpay-signature', 'valid_sig')
				.send({
					event: 'order.paid',
					payload: {
						order: {
							entity: {
								id: mockRazorpayOrderId,
								status: 'paid',
							},
						},
						payment: {
							entity: {
								id: mockRazorpayPaymentId,
								order_id: mockRazorpayOrderId,
							},
						},
					},
				})
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.received).toBe(true);
			expect(captureSpy).toHaveBeenCalled();
		});

		it('should mark food order transaction as FAILED and create outbox event on payment.failed webhook', async () => {
			jest.spyOn(razorpayGateway, 'verifyWebhookSignature').mockReturnValue(true);

			const pendingTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CREATED',
			});

			jest.spyOn(paymentTransactionRepository, 'findByOrderId').mockResolvedValueOnce(pendingTx);
			const failWithOutboxSpy = jest
				.spyOn(paymentTransactionRepository, 'failOrderPaymentWithOutbox')
				.mockResolvedValueOnce(pendingTx);

			const res = await request(app)
				.post(SUBSCRIPTION_ROUTES.WEBHOOK)
				.set('x-razorpay-signature', 'valid_sig')
				.send({
					event: 'payment.failed',
					payload: {
						payment: {
							entity: {
								id: 'pay_failed_999',
								order_id: mockRazorpayOrderId,
								error_description: 'Card declined by issuing bank',
							},
						},
					},
				})
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.received).toBe(true);
			expect(failWithOutboxSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					transaction: expect.any(PaymentTransaction),
					outbox: expect.objectContaining({
						eventType: 'payment.order.failed',
						aggregateId: mockOrderId,
						payload: expect.objectContaining({
							orderId: mockOrderId,
							failureReason: 'Card declined by issuing bank',
						}),
					}),
				}),
			);
		});

		it('should reject webhook with received: false when signature is invalid or missing (AC4)', async () => {
			const originalWebhookSecret = config.razorpay.webhookSecret;
			Object.assign(config.razorpay, { webhookSecret: 'test-webhook-secret' });
			try {
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
			} finally {
				Object.assign(config.razorpay, { webhookSecret: originalWebhookSecret });
			}
		});
	});

	describe('AC8: Customer Ownership & Security Guards', () => {
		it('should return 403 FORBIDDEN when x-user-id does not match customerId on verify', async () => {
			const mockPendingTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: 'actual-customer-id',
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CREATED',
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByOrderId')
				.mockResolvedValueOnce(mockPendingTx);

			const res = await request(app)
				.post(ORDER_PAYMENT_ROUTES.VERIFY)
				.set('x-user-id', 'attacker-user-id')
				.send({
					orderId: mockOrderId,
					razorpayOrderId: mockRazorpayOrderId,
					razorpayPaymentId: mockRazorpayPaymentId,
					razorpaySignature: mockSignature,
				})
				.expect(HTTP_STATUS.FORBIDDEN);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('CUSTOMER_UNAUTHORIZED');
		});

		it('should return 403 FORBIDDEN when x-user-id does not match customerId on status query', async () => {
			const mockTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: 'actual-customer-id',
				razorpayOrderId: mockRazorpayOrderId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CAPTURED',
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByCustomerOrderId')
				.mockResolvedValueOnce(mockTx);

			const res = await request(app)
				.get(`/orders/${mockOrderId}/status`)
				.set('x-user-id', 'attacker-user-id')
				.expect(HTTP_STATUS.FORBIDDEN);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('CUSTOMER_UNAUTHORIZED');
		});

		it('should succeed when x-user-id matches customerId on status query', async () => {
			const mockTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				razorpayPaymentId: mockRazorpayPaymentId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CAPTURED',
				metadata: { method: 'UPI' },
				createdAt: new Date('2026-10-27T00:00:00.000Z'),
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByCustomerOrderId')
				.mockResolvedValueOnce(mockTx);

			const res = await request(app)
				.get(`/orders/${mockOrderId}/status`)
				.set('x-user-id', mockCustomerId)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.orderId).toBe(mockOrderId);
			expect(res.body.data.status).toBe('CAPTURED');
			expect(res.body.data.method).toBe('UPI');
		});
	});

	describe('AC9: Customer Payment Status Query & Polling (UI Support)', () => {
		it('should return 401 UNAUTHORIZED when x-user-id header is missing on status query', async () => {
			const res = await request(app)
				.get(`/orders/${mockOrderId}/status`)
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('UNAUTHORIZED');
			expect(res.body.message).toBe('Customer authentication required');
		});

		it('should return payment status details on /orders/:orderId/status (200 OK)', async () => {
			const mockTx = new PaymentTransaction({
				id: 'pay-txn-uuid-001',
				restaurantId: mockRestaurantId,
				orderId: mockOrderId,
				customerId: mockCustomerId,
				razorpayOrderId: mockRazorpayOrderId,
				razorpayPaymentId: mockRazorpayPaymentId,
				amountPaise: 45000,
				currency: 'INR',
				status: 'CAPTURED',
				createdAt: new Date('2026-10-27T00:00:00.000Z'),
			});

			jest
				.spyOn(paymentTransactionRepository, 'findByCustomerOrderId')
				.mockResolvedValueOnce(mockTx);

			const res = await request(app)
				.get(`/orders/${mockOrderId}/status`)
				.set('x-user-id', mockCustomerId)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data).toEqual(
				expect.objectContaining({
					orderId: mockOrderId,
					paymentId: 'pay-txn-uuid-001',
					gatewayPaymentId: mockRazorpayPaymentId,
					razorpayOrderId: mockRazorpayOrderId,
					amountPaise: 45000,
					currency: 'INR',
					status: 'CAPTURED',
					method: 'ONLINE',
					createdAt: expect.any(String),
				}),
			);
		});

		it('should return 404 NOT_FOUND if order payment is not found', async () => {
			jest.spyOn(paymentTransactionRepository, 'findByCustomerOrderId').mockResolvedValueOnce(null);

			const res = await request(app)
				.get(`/orders/${mockOrderId}/status`)
				.set('x-user-id', mockCustomerId)
				.expect(HTTP_STATUS.NOT_FOUND);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('ORDER_PAYMENT_NOT_FOUND');
		});

		it('should return 422 UNPROCESSABLE_ENTITY on invalid orderId parameter', async () => {
			const res = await request(app)
				.get('/orders/not-a-uuid/status')
				.set('x-user-id', mockCustomerId)
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.error).toBe('VALIDATION_ERROR');
		});
	});
});
