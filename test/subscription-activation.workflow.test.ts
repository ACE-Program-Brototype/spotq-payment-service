import { PaymentTransaction } from '../src/domain/entities/payment-transaction.entity';
import { Subscription } from '../src/domain/entities/subscription.entity';
import {
	PlanBillingCycle,
	SubscriptionPlan,
} from '../src/domain/entities/subscription-plan.entity';
import { SubscriptionNotFoundError } from '../src/domain/errors/payment.errors';
import type { ISubscriptionRepository } from '../src/domain/repositories/subscription.repository.interface';
import { activateOrRenewSubscription } from '../src/domain/workflows/subscription-activation.workflow';
import { SUBSCRIPTION_EVENTS, SUBSCRIPTION_STATUS } from '../src/shared/constants';

describe('activateOrRenewSubscription workflow', () => {
	const fixedNow = new Date('2026-10-01T00:00:00.000Z');
	const plan = new SubscriptionPlan({
		id: 'plan-1',
		code: 'QUEUE_PRO_MONTHLY',
		name: 'Queue Pro',
		pricePaise: 149900,
		currency: 'INR',
		billingCycle: PlanBillingCycle.MONTHLY,
		features: ['Queue Management'],
		isActive: true,
	});

	let mockSubscriptionRepo: jest.Mocked<ISubscriptionRepository>;

	beforeEach(() => {
		mockSubscriptionRepo = {
			findById: jest.fn(),
			create: jest.fn(),
			findActiveByRestaurantId: jest.fn(),
			activateSubscriptionWithOutbox: jest.fn(),
			renewSubscriptionWithOutbox: jest.fn(),
			expirePastDueSubscriptionsWithOutbox: jest.fn(),
			findSubscribersPaginated: jest.fn(),
			findSubscriberDetailById: jest.fn(),
		};
	});

	it('activates a new subscription with outbox event when transaction is not a renewal', async () => {
		const tx = new PaymentTransaction({
			id: 'tx-1',
			restaurantId: 'rest-1',
			planId: plan.id,
			razorpayOrderId: 'order_123',
			amountPaise: 149900,
			currency: 'INR',
			status: 'CREATED',
		});

		const activatedSub = new Subscription({
			id: 'sub-new-1',
			restaurantId: 'rest-1',
			planId: plan.id,
			status: 'ACTIVE',
			currentPeriodStart: fixedNow,
			currentPeriodEnd: plan.calculatePeriodEnd(fixedNow),
		});
		mockSubscriptionRepo.activateSubscriptionWithOutbox.mockResolvedValue(activatedSub);

		const result = await activateOrRenewSubscription({
			subscriptionRepository: mockSubscriptionRepo,
			transaction: tx,
			plan,
			razorpayPaymentId: 'pay_123',
			razorpaySignature: 'sig_123',
			now: fixedNow,
			throwIfRenewalTargetMissing: true,
		});

		expect(result).toBe(activatedSub);
		expect(mockSubscriptionRepo.activateSubscriptionWithOutbox).toHaveBeenCalledWith({
			subscription: {
				restaurantId: 'rest-1',
				planId: plan.id,
				status: SUBSCRIPTION_STATUS.ACTIVE,
				currentPeriodStart: fixedNow,
				currentPeriodEnd: plan.calculatePeriodEnd(fixedNow),
			},
			payment: {
				razorpayOrderId: 'order_123',
				razorpayPaymentId: 'pay_123',
				razorpaySignature: 'sig_123',
			},
			outbox: expect.objectContaining({
				eventType: SUBSCRIPTION_EVENTS.ACTIVATED,
				aggregateId: 'rest-1',
				payload: expect.objectContaining({
					planCode: 'QUEUE_PRO',
					status: SUBSCRIPTION_STATUS.ACTIVE,
				}),
			}),
		});
	});

	it('renews an existing target subscription when transaction is a renewal', async () => {
		const renewalTx = new PaymentTransaction({
			id: 'tx-renew-1',
			restaurantId: 'rest-1',
			subscriptionId: 'sub-1',
			planId: plan.id,
			razorpayOrderId: 'order_renew_1',
			amountPaise: 149900,
			currency: 'INR',
			status: 'CREATED',
			metadata: { isRenewal: true, targetSubscriptionId: 'sub-1' },
		});

		const expiredSub = new Subscription({
			id: 'sub-1',
			restaurantId: 'rest-1',
			planId: plan.id,
			status: 'EXPIRED',
			currentPeriodStart: new Date('2026-08-01T00:00:00.000Z'),
			currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
		});
		mockSubscriptionRepo.findById.mockResolvedValue(expiredSub);
		mockSubscriptionRepo.renewSubscriptionWithOutbox.mockResolvedValue(expiredSub);

		const result = await activateOrRenewSubscription({
			subscriptionRepository: mockSubscriptionRepo,
			transaction: renewalTx,
			plan,
			razorpayPaymentId: 'pay_renew_1',
			razorpaySignature: '',
			now: fixedNow,
		});

		expect(result).toBe(expiredSub);
		expect(mockSubscriptionRepo.renewSubscriptionWithOutbox).toHaveBeenCalledWith(
			expect.objectContaining({
				subscription: expect.objectContaining({
					subscriptionId: 'sub-1',
					status: SUBSCRIPTION_STATUS.ACTIVE,
				}),
				outbox: expect.objectContaining({
					payload: expect.objectContaining({ subscriptionId: 'sub-1' }),
				}),
			}),
		);
	});

	it('throws SubscriptionNotFoundError when renewal target is missing and throwIfRenewalTargetMissing is true', async () => {
		const renewalTx = new PaymentTransaction({
			id: 'tx-renew-missing',
			restaurantId: 'rest-1',
			subscriptionId: 'sub-missing',
			planId: plan.id,
			razorpayOrderId: 'order_missing',
			amountPaise: 149900,
			currency: 'INR',
			status: 'CREATED',
			metadata: { isRenewal: true, targetSubscriptionId: 'sub-missing' },
		});

		mockSubscriptionRepo.findById.mockResolvedValue(null);

		await expect(
			activateOrRenewSubscription({
				subscriptionRepository: mockSubscriptionRepo,
				transaction: renewalTx,
				plan,
				razorpayPaymentId: 'pay_1',
				razorpaySignature: 'sig_1',
				now: fixedNow,
				throwIfRenewalTargetMissing: true,
			}),
		).rejects.toThrow(SubscriptionNotFoundError);
	});

	it('returns null without throwing when renewal target is missing and throwIfRenewalTargetMissing is false', async () => {
		const renewalTx = new PaymentTransaction({
			id: 'tx-renew-missing',
			restaurantId: 'rest-1',
			subscriptionId: 'sub-missing',
			planId: plan.id,
			razorpayOrderId: 'order_missing',
			amountPaise: 149900,
			currency: 'INR',
			status: 'CREATED',
			metadata: { isRenewal: true, targetSubscriptionId: 'sub-missing' },
		});

		mockSubscriptionRepo.findById.mockResolvedValue(null);

		const result = await activateOrRenewSubscription({
			subscriptionRepository: mockSubscriptionRepo,
			transaction: renewalTx,
			plan,
			razorpayPaymentId: 'pay_1',
			razorpaySignature: '',
			now: fixedNow,
			throwIfRenewalTargetMissing: false,
		});

		expect(result).toBeNull();
		expect(mockSubscriptionRepo.renewSubscriptionWithOutbox).not.toHaveBeenCalled();
	});
});
