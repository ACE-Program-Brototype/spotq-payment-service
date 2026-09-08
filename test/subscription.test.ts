import crypto from 'node:crypto';
import { PlanBillingCycle } from '@prisma/client';
import { CreateSubscriptionOrderUseCase } from '../src/application/use-cases/create-subscription-order.use-case.ts';
import { GetSubscriptionPlansUseCase } from '../src/application/use-cases/get-subscription-plans.use-case.ts';
import { PaymentTransaction } from '../src/domain/entities/payment-transaction.entity.ts';
import { Subscription } from '../src/domain/entities/subscription.entity.ts';
import { SubscriptionPlan } from '../src/domain/entities/subscription-plan.entity.ts';
import {
	ActiveSubscriptionAlreadyExistsError,
	PlanNotFoundError,
} from '../src/domain/errors/payment.errors.ts';
import { razorpayGateway } from '../src/infrastructure/payment/razorpay.gateway.ts';

describe('Subscription & Payment Use Cases', () => {
	const mockPlan = new SubscriptionPlan({
		id: '11111111-1111-1111-1111-111111111111',
		code: 'QUEUE_PRO',
		name: 'Queue Pro',
		description: 'Queue pro plan description',
		pricePaise: 149900,
		currency: 'INR',
		billingCycle: PlanBillingCycle.MONTHLY,
		features: ['Queue Management', 'SMS Alerts'],
		isActive: true,
	});

	const mockPlanRepo = {
		findAllActive: jest.fn().mockResolvedValue([mockPlan]),
		findById: jest.fn().mockResolvedValue(mockPlan),
		findByCode: jest.fn().mockResolvedValue(mockPlan),
	};

	const mockSubRepo = {
		findActiveByRestaurantId: jest.fn().mockResolvedValue(null),
		findById: jest.fn().mockResolvedValue(null),
		create: jest.fn(),
		activateSubscriptionWithOutbox: jest.fn(),
	};

	const mockTxRepo = {
		findByOrderId: jest.fn().mockResolvedValue(null),
		findByPaymentId: jest.fn().mockResolvedValue(null),
		findPendingByRestaurantAndPlan: jest.fn().mockResolvedValue(null),
		create: jest.fn(),
		markSuccess: jest.fn(),
		markFailed: jest.fn(),
	};

	const mockGateway = {
		initialize: jest.fn().mockResolvedValue(undefined),
		isHealthy: jest.fn().mockReturnValue(true),
		createOrder: jest.fn().mockResolvedValue({
			orderId: 'order_test_123',
			amount: 149900,
			currency: 'INR',
			status: 'created',
		}),
		verifyPaymentSignature: jest.fn().mockReturnValue(true),
		verifyWebhookSignature: jest.fn().mockReturnValue(true),
		getPaymentDetails: jest.fn().mockResolvedValue({}),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('GetSubscriptionPlansUseCase', () => {
		it('should fetch all active subscription plans', async () => {
			const useCase = new GetSubscriptionPlansUseCase(mockPlanRepo);
			const plans = await useCase.execute();

			expect(plans).toHaveLength(1);
			expect(plans[0].code).toBe('QUEUE_PRO');
			expect(plans[0].priceInRupees).toBe(1499);
		});
	});

	describe('CreateSubscriptionOrderUseCase', () => {
		it('should create a Razorpay order and save payment transaction', async () => {
			const useCase = new CreateSubscriptionOrderUseCase(
				mockPlanRepo,
				mockSubRepo,
				mockTxRepo,
				mockGateway,
			);

			const result = await useCase.execute({
				restaurantId: '22222222-2222-2222-2222-222222222222',
				planId: mockPlan.id,
				restaurantName: 'Test Bistro',
			});

			expect(result.orderId).toBe('order_test_123');
			expect(result.amount).toBe(149900);
			expect(mockGateway.createOrder).toHaveBeenCalledWith(
				expect.objectContaining({
					amountInPaise: 149900,
					currency: 'INR',
				}),
			);
			expect(mockTxRepo.create).toHaveBeenCalled();
		});

		it('should reuse existing pending order within 15 minutes', async () => {
			const existingTx = new PaymentTransaction({
				id: 'tx-1',
				restaurantId: '22222222-2222-2222-2222-222222222222',
				planId: mockPlan.id,
				razorpayOrderId: 'order_existing_123',
				amountPaise: 149900,
				currency: 'INR',
				status: 'CREATED',
			});

			mockTxRepo.findPendingByRestaurantAndPlan.mockResolvedValueOnce(existingTx);

			const useCase = new CreateSubscriptionOrderUseCase(
				mockPlanRepo,
				mockSubRepo,
				mockTxRepo,
				mockGateway,
			);

			const result = await useCase.execute({
				restaurantId: '22222222-2222-2222-2222-222222222222',
				planId: mockPlan.id,
			});

			expect(result.orderId).toBe('order_existing_123');
			expect(mockGateway.createOrder).not.toHaveBeenCalled();
		});

		it('should throw PlanNotFoundError if plan is not found', async () => {
			mockPlanRepo.findById.mockResolvedValueOnce(null);

			const useCase = new CreateSubscriptionOrderUseCase(
				mockPlanRepo,
				mockSubRepo,
				mockTxRepo,
				mockGateway,
			);

			await expect(
				useCase.execute({
					restaurantId: '22222222-2222-2222-2222-222222222222',
					planId: 'invalid-id',
				}),
			).rejects.toThrow(PlanNotFoundError);
		});

		it('should throw ActiveSubscriptionAlreadyExistsError if restaurant is already active', async () => {
			const activeSub = new Subscription({
				id: 'sub-1',
				restaurantId: '22222222-2222-2222-2222-222222222222',
				planId: mockPlan.id,
				status: 'ACTIVE',
				currentPeriodStart: new Date(),
				currentPeriodEnd: new Date(Date.now() + 86400000 * 20),
			});
			mockSubRepo.findActiveByRestaurantId.mockResolvedValueOnce(activeSub);

			const useCase = new CreateSubscriptionOrderUseCase(
				mockPlanRepo,
				mockSubRepo,
				mockTxRepo,
				mockGateway,
			);

			await expect(
				useCase.execute({
					restaurantId: '22222222-2222-2222-2222-222222222222',
					planId: mockPlan.id,
				}),
			).rejects.toThrow(ActiveSubscriptionAlreadyExistsError);
		});
	});

	describe('Cryptographic Signature Verification', () => {
		it('should verify valid HMAC SHA256 signature using timingSafeEqual', () => {
			const keySecret = 'test_secret_key_1234567890';
			const orderId = 'order_ABC123';
			const paymentId = 'pay_XYZ789';
			const expectedSignature = crypto
				.createHmac('sha256', keySecret)
				.update(`${orderId}|${paymentId}`)
				.digest('hex');

			const isValid = razorpayGateway.verifyPaymentSignature({
				orderId,
				paymentId,
				signature: expectedSignature,
			});

			expect(isValid).toBe(true);
		});

		it('should reject invalid or tampered signatures', () => {
			const isValid = razorpayGateway.verifyPaymentSignature({
				orderId: 'order_ABC123',
				paymentId: 'pay_XYZ789',
				signature: 'tampered_signature_abc',
			});

			expect(isValid).toBe(false);
		});
	});
});
