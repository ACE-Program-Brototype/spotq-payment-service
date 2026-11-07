import { RenewSubscriptionUseCase } from '@application/use-cases/subscriptions/renew-subscription.use-case.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import { Subscription } from '@domain/entities/subscription.entity.ts';
import { PlanBillingCycle, SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import {
	ForbiddenSubscriptionAccessError,
	IdempotencyKeyPayloadMismatchError,
	IdempotencyRequestInProgressError,
	IdempotencyStorageUnavailableError,
	MissingIdempotencyKeyError,
	PaymentGatewayUnavailableError,
	PlanNotFoundError,
	RenewalAlreadyInProgressError,
	SubscriptionNotEligibleForRenewalError,
	SubscriptionNotFoundError,
	UnauthorizedRestaurantError,
} from '@domain/errors/payment.errors.ts';
import { InvoiceNumber } from '@domain/value-objects/invoice-number.value-object.ts';
import { RedisIdempotencyService } from '@infrastructure/redis/redis-idempotency.service.ts';
import { INVOICE_STATUS } from '@shared/constants/index.ts';

describe('RenewSubscriptionUseCase & Subscription Domain Invariants', () => {
	const mockRestaurantId = '22222222-2222-4222-8222-222222222222';
	const mockSubscriptionId = '33333333-3333-4333-8333-333333333333';
	const mockPlanId = '11111111-1111-4111-8111-111111111111';
	const upgradedPlanId = '44444444-4444-4444-8444-444444444444';
	const defaultIdempotencyKey = 'idem-renew-key-0001';

	const mockPlan = new SubscriptionPlan({
		id: mockPlanId,
		code: 'QUEUE_PRO',
		name: 'Queue Pro',
		description: 'Standard pro plan',
		pricePaise: 149900,
		currency: 'INR',
		billingCycle: PlanBillingCycle.MONTHLY,
		features: ['Queue Management'],
		isActive: true,
	});

	const upgradedPlan = new SubscriptionPlan({
		id: upgradedPlanId,
		code: 'QUEUE_ENTERPRISE',
		name: 'Queue Enterprise',
		description: 'Enterprise annual plan',
		pricePaise: 1499000,
		currency: 'INR',
		billingCycle: PlanBillingCycle.YEARLY,
		features: ['Unlimited Queues', 'Custom SMS'],
		isActive: true,
	});

	const mockPlanRepo = {
		findAllActive: jest.fn().mockResolvedValue([mockPlan, upgradedPlan]),
		findById: jest.fn().mockImplementation(async (id: string) => {
			if (id === mockPlanId) return mockPlan;
			if (id === upgradedPlanId) return upgradedPlan;
			return null;
		}),
		findByCode: jest.fn(),
	};

	const mockSubRepo = {
		findActiveByRestaurantId: jest.fn().mockResolvedValue(null),
		findById: jest.fn(),
		create: jest.fn(),
		activateSubscriptionWithOutbox: jest.fn(),
		renewSubscriptionWithOutbox: jest.fn(),
		findSubscribersPaginated: jest.fn(),
		findSubscriberDetailById: jest.fn(),
	};

	const mockTxRepo = {
		findByOrderId: jest.fn().mockResolvedValue(null),
		findByCustomerOrderId: jest.fn().mockResolvedValue(null),
		findByPaymentId: jest.fn().mockResolvedValue(null),
		findPendingByRestaurantAndPlan: jest.fn().mockResolvedValue(null),
		findPendingRenewalBySubscriptionAndPlan: jest.fn().mockResolvedValue(null),
		create: jest.fn().mockResolvedValue({ id: 'tx-renew-1' }),
		createRenewalWithInvoice: jest.fn().mockImplementation(async (params) => ({
			id: 'tx-renew-1',
			...params.transaction,
		})),
		captureOrderPaymentWithOutbox: jest.fn(),
		failOrderPaymentWithOutbox: jest.fn(),
		markSuccess: jest.fn(),
		markFailed: jest.fn(),
		resetToCreated: jest.fn().mockResolvedValue({}),
	};

	const mockGateway = {
		initialize: jest.fn().mockResolvedValue(undefined),
		isHealthy: jest.fn().mockReturnValue(true),
		createOrder: jest.fn().mockResolvedValue({
			orderId: 'order_renew_123',
			amount: 149900,
			currency: 'INR',
			status: 'created',
		}),
		verifyPaymentSignature: jest.fn().mockReturnValue(true),
		verifyWebhookSignature: jest.fn().mockReturnValue(true),
		getPaymentDetails: jest.fn().mockResolvedValue({}),
	};

	const mockInvoiceRepo = {
		findByInvoiceNumber: jest.fn(),
		findByPaymentTransactionId: jest.fn(),
		findByRestaurantId: jest.fn(),
		create: jest.fn().mockResolvedValue({}),
		update: jest.fn().mockResolvedValue({}),
		delete: jest.fn().mockResolvedValue(true),
		findById: jest.fn(),
	};

	const createMockRedisClient = () => {
		const store = new Map<string, string>();
		return {
			isOpen: true,
			store,
			set: jest.fn(
				async (
					key: string,
					value: string,
					options?: { NX?: boolean; EX?: number },
				): Promise<string | null> => {
					if (options?.NX && store.has(key)) {
						return null;
					}
					store.set(key, value);
					return 'OK';
				},
			),
			get: jest.fn(async (key: string): Promise<string | null> => {
				return store.get(key) ?? null;
			}),
			eval: jest.fn(
				async (
					script: string,
					options: { keys: string[]; arguments: string[] },
				): Promise<number> => {
					const key = options.keys[0];
					const token = options.arguments[0];
					const current = store.get(key);
					if (!current) {
						return 0;
					}
					if (script.includes('string.find')) {
						if (current.includes(token)) {
							store.delete(key);
							return 1;
						}
						return 0;
					}
					if (current === token) {
						store.delete(key);
						return 1;
					}
					return 0;
				},
			),
		};
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockGateway.isHealthy.mockReturnValue(true);
	});

	it('should generate standardized INV-timestamp-suffix invoice numbers via InvoiceNumber value object', () => {
		const generated = InvoiceNumber.generate(1700000000000);
		expect(generated).toMatch(/^INV-1700000000000-\d{4}$/);
		expect(InvoiceNumber.of(generated).toString()).toBe(generated);
	});

	it('should calculate renewal period from now when subscription is expired, and from currentPeriodEnd when active', () => {
		const now = new Date('2026-11-06T00:00:00.000Z');
		const expiredSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'EXPIRED',
			currentPeriodStart: new Date('2026-09-01T00:00:00.000Z'),
			currentPeriodEnd: new Date('2026-10-01T00:00:00.000Z'),
		});

		const expiredPeriod = expiredSub.calculateRenewalPeriod(mockPlan, now);
		expect(expiredPeriod.currentPeriodStart).toEqual(now);
		expect(expiredPeriod.currentPeriodEnd).toEqual(mockPlan.calculatePeriodEnd(now));

		const activeEnd = new Date('2026-11-20T00:00:00.000Z');
		const activeStart = new Date('2026-10-20T00:00:00.000Z');
		const activeSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'ACTIVE',
			currentPeriodStart: activeStart,
			currentPeriodEnd: activeEnd,
		});

		const activePeriod = activeSub.calculateRenewalPeriod(mockPlan, now);
		expect(activePeriod.currentPeriodStart).toEqual(activeStart);
		expect(activePeriod.currentPeriodEnd).toEqual(mockPlan.calculatePeriodEnd(activeEnd));
	});

	it('should throw UnauthorizedRestaurantError if restaurantId is missing', async () => {
		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: '',
				idempotencyKey: defaultIdempotencyKey,
			}),
		).rejects.toThrow(UnauthorizedRestaurantError);
	});

	it('should throw MissingIdempotencyKeyError if idempotencyKey is empty', async () => {
		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: '   ',
			}),
		).rejects.toThrow(MissingIdempotencyKeyError);
	});

	it('should throw SubscriptionNotFoundError if subscription does not exist', async () => {
		mockSubRepo.findById.mockResolvedValueOnce(null);

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: defaultIdempotencyKey,
			}),
		).rejects.toThrow(SubscriptionNotFoundError);
	});

	it('should throw ForbiddenSubscriptionAccessError (403) if restaurant does not own the subscription', async () => {
		const foreignSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: '99999999-9999-4999-8999-999999999999',
			planId: mockPlanId,
			status: 'EXPIRED',
			currentPeriodStart: new Date(Date.now() - 60 * 86400000),
			currentPeriodEnd: new Date(Date.now() - 30 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValueOnce(foreignSub);

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: defaultIdempotencyKey,
			}),
		).rejects.toThrow(ForbiddenSubscriptionAccessError);
	});

	it('should throw SubscriptionNotEligibleForRenewalError if subscription is CANCELLED', async () => {
		const cancelledSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'CANCELLED',
			currentPeriodStart: new Date(Date.now() - 60 * 86400000),
			currentPeriodEnd: new Date(Date.now() - 30 * 86400000),
			canceledAt: new Date(Date.now() - 30 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValueOnce(cancelledSub);

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: defaultIdempotencyKey,
			}),
		).rejects.toThrow(SubscriptionNotEligibleForRenewalError);
	});

	it('should throw SubscriptionNotEligibleForRenewalError if active subscription has more than 30 days remaining', async () => {
		const activeFarSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'ACTIVE',
			currentPeriodStart: new Date(),
			currentPeriodEnd: new Date(Date.now() + 45 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValueOnce(activeFarSub);

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: defaultIdempotencyKey,
			}),
		).rejects.toThrow(SubscriptionNotEligibleForRenewalError);
	});

	it('should throw PlanNotFoundError if target plan is inactive or does not exist', async () => {
		const expiredSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: 'non-existent-plan-id',
			status: 'EXPIRED',
			currentPeriodStart: new Date(Date.now() - 60 * 86400000),
			currentPeriodEnd: new Date(Date.now() - 30 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValueOnce(expiredSub);

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: defaultIdempotencyKey,
			}),
		).rejects.toThrow(PlanNotFoundError);
	});

	it('should throw PaymentGatewayUnavailableError (503) when gateway is unhealthy or order creation fails', async () => {
		const expiredSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'EXPIRED',
			currentPeriodStart: new Date(Date.now() - 60 * 86400000),
			currentPeriodEnd: new Date(Date.now() - 10 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValue(expiredSub);
		mockGateway.isHealthy.mockReturnValueOnce(false);

		const idempotencyService = new RedisIdempotencyService(createMockRedisClient() as never);
		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
			idempotencyService,
		);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: defaultIdempotencyKey,
			}),
		).rejects.toThrow(PaymentGatewayUnavailableError);

		mockGateway.createOrder.mockRejectedValueOnce(new Error('Razorpay network timeout'));
		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: defaultIdempotencyKey,
			}),
		).rejects.toThrow(PaymentGatewayUnavailableError);
	});

	it('should create a renewal order successfully for an EXPIRED subscription and store idempotencyKey in metadata', async () => {
		const expiredSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'EXPIRED',
			currentPeriodStart: new Date(Date.now() - 60 * 86400000),
			currentPeriodEnd: new Date(Date.now() - 10 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValueOnce(expiredSub);

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		const result = await useCase.execute({
			subscriptionId: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			idempotencyKey: defaultIdempotencyKey,
			restaurantName: 'Bistro Spice',
		});

		expect(result.orderId).toBe('order_renew_123');
		expect(result.amount).toBe(149900);
		expect(result.plan.code).toBe('QUEUE_PRO');
		expect(result.subscription.id).toBe(mockSubscriptionId);
		expect(result.subscription.currentStatus).toBe('EXPIRED');
		expect(result.subscription.isRenewal).toBe(true);
		expect(mockGateway.createOrder).toHaveBeenCalledWith(
			expect.objectContaining({
				amountInPaise: 149900,
				notes: expect.objectContaining({
					isRenewal: 'true',
					subscriptionId: mockSubscriptionId,
				}),
			}),
		);
		expect(mockTxRepo.createRenewalWithInvoice).toHaveBeenCalledWith(
			expect.objectContaining({
				transaction: expect.objectContaining({
					subscriptionId: mockSubscriptionId,
					status: 'CREATED',
					metadata: expect.objectContaining({
						idempotencyKey: defaultIdempotencyKey,
					}),
				}),
				invoice: expect.objectContaining({
					status: INVOICE_STATUS.DRAFT,
				}),
			}),
		);
	});

	it('should create a renewal order successfully for an ACTIVE subscription within 30-day window', async () => {
		const activeExpiringSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'ACTIVE',
			currentPeriodStart: new Date(Date.now() - 25 * 86400000),
			currentPeriodEnd: new Date(Date.now() + 5 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValueOnce(activeExpiringSub);

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		const result = await useCase.execute({
			subscriptionId: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			idempotencyKey: defaultIdempotencyKey,
		});

		expect(result.orderId).toBe('order_renew_123');
		expect(result.subscription.currentStatus).toBe('ACTIVE');
		expect(mockGateway.createOrder).toHaveBeenCalled();
	});

	it('should support upgrading planId during renewal', async () => {
		const activeExpiringSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'ACTIVE',
			currentPeriodStart: new Date(Date.now() - 25 * 86400000),
			currentPeriodEnd: new Date(Date.now() + 5 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValueOnce(activeExpiringSub);

		mockGateway.createOrder.mockResolvedValueOnce({
			orderId: 'order_upgrade_renew_123',
			amount: 1499000,
			currency: 'INR',
			status: 'created',
		});

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		const result = await useCase.execute({
			subscriptionId: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			idempotencyKey: 'idem-upgrade-0001',
			planId: upgradedPlanId,
		});

		expect(result.orderId).toBe('order_upgrade_renew_123');
		expect(result.amount).toBe(1499000);
		expect(result.plan.code).toBe('QUEUE_ENTERPRISE');
	});

	it('should reuse pending renewal transaction within reuse window', async () => {
		const activeExpiringSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'ACTIVE',
			currentPeriodStart: new Date(Date.now() - 25 * 86400000),
			currentPeriodEnd: new Date(Date.now() + 5 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValueOnce(activeExpiringSub);

		const existingPendingTx = new PaymentTransaction({
			id: 'tx-existing-pending-1',
			restaurantId: mockRestaurantId,
			subscriptionId: mockSubscriptionId,
			planId: mockPlanId,
			razorpayOrderId: 'order_pending_reuse_123',
			amountPaise: 149900,
			currency: 'INR',
			status: 'CREATED',
		});
		mockTxRepo.findPendingRenewalBySubscriptionAndPlan.mockResolvedValueOnce(existingPendingTx);

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		const result = await useCase.execute({
			subscriptionId: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			idempotencyKey: defaultIdempotencyKey,
		});

		expect(result.orderId).toBe('order_pending_reuse_123');
		expect(mockGateway.createOrder).not.toHaveBeenCalled();
		expect(mockTxRepo.create).not.toHaveBeenCalled();
	});

	it('should reset failed transaction to CREATED when retrying renewal', async () => {
		const activeExpiringSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'ACTIVE',
			currentPeriodStart: new Date(Date.now() - 25 * 86400000),
			currentPeriodEnd: new Date(Date.now() + 5 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValueOnce(activeExpiringSub);

		const failedTx = new PaymentTransaction({
			id: 'tx-failed-1',
			restaurantId: mockRestaurantId,
			subscriptionId: mockSubscriptionId,
			planId: mockPlanId,
			razorpayOrderId: 'order_failed_retry_123',
			amountPaise: 149900,
			currency: 'INR',
			status: 'FAILED',
			failureReason: 'Payment cancelled by user',
		});
		mockTxRepo.findPendingRenewalBySubscriptionAndPlan.mockResolvedValueOnce(failedTx);

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
		);

		const result = await useCase.execute({
			subscriptionId: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			idempotencyKey: defaultIdempotencyKey,
		});

		expect(result.orderId).toBe('order_failed_retry_123');
		expect(mockTxRepo.resetToCreated).toHaveBeenCalledWith('order_failed_retry_123');
		expect(mockInvoiceRepo.findByPaymentTransactionId).toHaveBeenCalledWith('tx-failed-1');
		expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				paymentTransactionId: 'tx-failed-1',
				status: INVOICE_STATUS.DRAFT,
			}),
		);
		expect(mockGateway.createOrder).not.toHaveBeenCalled();
	});

	it('should replay cached renewal response for duplicate Idempotency-Key and reject payload mismatch', async () => {
		const activeExpiringSub = new Subscription({
			id: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			planId: mockPlanId,
			status: 'ACTIVE',
			currentPeriodStart: new Date(Date.now() - 25 * 86400000),
			currentPeriodEnd: new Date(Date.now() + 5 * 86400000),
		});
		mockSubRepo.findById.mockResolvedValueOnce(activeExpiringSub);

		const idempotencyService = new RedisIdempotencyService(createMockRedisClient() as never);
		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
			idempotencyService,
		);

		const first = await useCase.execute({
			subscriptionId: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			idempotencyKey: 'idem-same-key-9999',
			planId: mockPlanId,
		});

		const replayed = await useCase.execute({
			subscriptionId: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			idempotencyKey: 'idem-same-key-9999',
			planId: mockPlanId,
		});

		expect(first.replayed).toBeUndefined();
		expect(replayed.replayed).toBe(true);
		expect(replayed.orderId).toBe(first.orderId);
		expect(mockGateway.createOrder).toHaveBeenCalledTimes(1);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: 'idem-same-key-9999',
				planId: upgradedPlanId,
			}),
		).rejects.toThrow(IdempotencyKeyPayloadMismatchError);
	});

	it('should reject concurrent duplicate Idempotency-Key and concurrent per-subscription lock contention', async () => {
		const idempotencyService = new RedisIdempotencyService(createMockRedisClient() as never);
		let resolveSubLookup!: (sub: Subscription) => void;
		mockSubRepo.findById.mockImplementationOnce(
			() =>
				new Promise<Subscription>((resolve) => {
					resolveSubLookup = resolve;
				}),
		);

		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
			idempotencyService,
		);

		const firstPromise = useCase.execute({
			subscriptionId: mockSubscriptionId,
			restaurantId: mockRestaurantId,
			idempotencyKey: 'idem-concurrent-key-1',
		});

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: 'idem-concurrent-key-1',
			}),
		).rejects.toThrow(IdempotencyRequestInProgressError);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: 'idem-concurrent-key-2',
			}),
		).rejects.toThrow(RenewalAlreadyInProgressError);

		resolveSubLookup(
			new Subscription({
				id: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				planId: mockPlanId,
				status: 'ACTIVE',
				currentPeriodStart: new Date(Date.now() - 25 * 86400000),
				currentPeriodEnd: new Date(Date.now() + 5 * 86400000),
			}),
		);

		const completed = await firstPromise;
		expect(completed.orderId).toBe('order_renew_123');
	});

	it('should fail closed and throw IdempotencyStorageUnavailableError when Redis is disconnected', async () => {
		const idempotencyService = new RedisIdempotencyService({ isOpen: false } as never);
		const useCase = new RenewSubscriptionUseCase(
			mockPlanRepo,
			mockSubRepo,
			mockTxRepo,
			mockGateway,
			mockInvoiceRepo,
			idempotencyService,
		);

		await expect(
			useCase.execute({
				subscriptionId: mockSubscriptionId,
				restaurantId: mockRestaurantId,
				idempotencyKey: defaultIdempotencyKey,
			}),
		).rejects.toThrow(IdempotencyStorageUnavailableError);
	});
});
