import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import { PaymentCapturedHandler } from '@application/use-cases/webhooks/payment-captured.handler.ts';
import { PaymentFailedHandler } from '@application/use-cases/webhooks/payment-failed.handler.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import { Subscription } from '@domain/entities/subscription.entity.ts';
import { PlanBillingCycle, SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { PAYMENT_EVENTS, RAZORPAY_WEBHOOK_EVENTS } from '@shared/constants/index.ts';

jest.mock('@infrastructure/logger/index.ts', () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

describe('Webhook Event Strategy Handlers', () => {
	let mockTxRepo: jest.Mocked<IPaymentTransactionRepository>;
	let mockPlanRepo: jest.Mocked<ISubscriptionPlanRepository>;
	let mockSubRepo: jest.Mocked<ISubscriptionRepository>;
	let mockOutboxRelay: jest.Mocked<IOutboxRelayService>;

	const mockPlan = new SubscriptionPlan({
		id: 'plan-1',
		code: 'QUEUE_PRO_MONTHLY',
		name: 'Queue Pro',
		pricePaise: 149900,
		currency: 'INR',
		billingCycle: PlanBillingCycle.MONTHLY,
		features: ['Queue Management'],
		isActive: true,
	});

	beforeEach(() => {
		jest.clearAllMocks();

		mockTxRepo = {
			findById: jest.fn(),
			findByOrderId: jest.fn(),
			findByCustomerOrderId: jest.fn(),
			findCapturedByOrderId: jest.fn(),
			findByPaymentId: jest.fn(),
			findPendingByRestaurantAndPlan: jest.fn(),
			findPendingRenewalBySubscriptionAndPlan: jest.fn(),
			create: jest.fn(),
			captureOrderPaymentWithOutbox: jest.fn(),
			failOrderPaymentWithOutbox: jest.fn(),
			processOrderRefund: jest.fn(),
			syncRefundFromWebhook: jest.fn(),
			markSuccess: jest.fn(),
			markFailed: jest.fn(),
			resetToCreated: jest.fn(),
		};

		mockPlanRepo = {
			findById: jest.fn(),
			findByCode: jest.fn(),
			findAllActive: jest.fn(),
		};

		mockSubRepo = {
			findById: jest.fn(),
			findActiveByRestaurantId: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			activateSubscriptionWithOutbox: jest.fn(),
			renewSubscriptionWithOutbox: jest.fn(),
			expirePastDueSubscriptionsWithOutbox: jest.fn(),
			findSubscribersPaginated: jest.fn(),
			findSubscriberDetailById: jest.fn(),
		};

		mockOutboxRelay = {
			start: jest.fn(),
			stop: jest.fn(),
			processPendingEvents: jest.fn().mockResolvedValue(undefined),
			replayDeadLetterEvent: jest.fn(),
		} as unknown as jest.Mocked<IOutboxRelayService>;
	});

	describe('PaymentCapturedHandler', () => {
		it('activates a subscription and triggers outbox relay on payment.captured webhook', async () => {
			const tx = new PaymentTransaction({
				id: 'tx-sub-1',
				restaurantId: 'rest-1',
				planId: mockPlan.id,
				razorpayOrderId: 'order_sub_1',
				amountPaise: 149900,
				currency: 'INR',
				status: 'CREATED',
			});
			const activatedSub = new Subscription({
				id: 'sub-1',
				restaurantId: 'rest-1',
				planId: mockPlan.id,
				status: 'ACTIVE',
				currentPeriodStart: new Date(),
				currentPeriodEnd: new Date(Date.now() + 86400000),
			});

			mockTxRepo.findByOrderId.mockResolvedValue(tx);
			mockPlanRepo.findById.mockResolvedValue(mockPlan);
			mockSubRepo.activateSubscriptionWithOutbox.mockResolvedValue(activatedSub);

			const handler = new PaymentCapturedHandler(
				mockTxRepo,
				mockPlanRepo,
				mockSubRepo,
				mockOutboxRelay,
			);

			await handler.handle(RAZORPAY_WEBHOOK_EVENTS.PAYMENT_CAPTURED, {
				event: RAZORPAY_WEBHOOK_EVENTS.PAYMENT_CAPTURED,
				payload: {
					payment: {
						entity: {
							id: 'pay_sub_1',
							order_id: 'order_sub_1',
							status: 'captured',
							amount: 149900,
						},
					},
				},
			});

			expect(mockSubRepo.activateSubscriptionWithOutbox).toHaveBeenCalledTimes(1);
			expect(mockOutboxRelay.processPendingEvents).toHaveBeenCalledTimes(1);
		});

		it('acknowledges idempotently when subscription transaction is already completed', async () => {
			const completedTx = new PaymentTransaction({
				id: 'tx-sub-2',
				restaurantId: 'rest-1',
				subscriptionId: 'sub-1',
				planId: mockPlan.id,
				razorpayOrderId: 'order_done',
				amountPaise: 149900,
				currency: 'INR',
				status: 'SUCCESS',
			});

			mockTxRepo.findByOrderId.mockResolvedValue(completedTx);

			const handler = new PaymentCapturedHandler(
				mockTxRepo,
				mockPlanRepo,
				mockSubRepo,
				mockOutboxRelay,
			);

			await handler.handle(RAZORPAY_WEBHOOK_EVENTS.ORDER_PAID, {
				event: RAZORPAY_WEBHOOK_EVENTS.ORDER_PAID,
				payload: {
					order: { entity: { id: 'order_done', status: 'paid' } },
				},
			});

			expect(mockPlanRepo.findById).not.toHaveBeenCalled();
			expect(mockSubRepo.activateSubscriptionWithOutbox).not.toHaveBeenCalled();
		});
	});

	describe('PaymentFailedHandler', () => {
		it('ignores failure webhook when transaction is already completed', async () => {
			const completedTx = new PaymentTransaction({
				id: 'tx-done',
				restaurantId: 'rest-1',
				orderId: 'food-order-1',
				customerId: 'cust-1',
				razorpayOrderId: 'order_done',
				amountPaise: 50000,
				currency: 'INR',
				status: 'CAPTURED',
			});

			mockTxRepo.findByOrderId.mockResolvedValue(completedTx);

			const handler = new PaymentFailedHandler(mockTxRepo, mockOutboxRelay);

			await handler.handle(RAZORPAY_WEBHOOK_EVENTS.PAYMENT_FAILED, {
				event: RAZORPAY_WEBHOOK_EVENTS.PAYMENT_FAILED,
				payload: {
					payment: {
						entity: {
							id: 'pay_fail_1',
							order_id: 'order_done',
							status: 'failed',
							amount: 50000,
							error_description: 'Declined',
						},
					},
				},
			});

			expect(mockTxRepo.failOrderPaymentWithOutbox).not.toHaveBeenCalled();
			expect(mockTxRepo.markFailed).not.toHaveBeenCalled();
		});

		it('fails food order payment with outbox event and triggers outbox relay', async () => {
			const pendingOrderTx = new PaymentTransaction({
				id: 'tx-order-1',
				restaurantId: 'rest-1',
				orderId: 'food-order-1',
				customerId: 'cust-1',
				razorpayOrderId: 'order_food_fail',
				amountPaise: 50000,
				currency: 'INR',
				status: 'CREATED',
			});

			mockTxRepo.findByOrderId.mockResolvedValue(pendingOrderTx);
			mockTxRepo.failOrderPaymentWithOutbox.mockResolvedValue(pendingOrderTx);

			const handler = new PaymentFailedHandler(mockTxRepo, mockOutboxRelay);

			await handler.handle(RAZORPAY_WEBHOOK_EVENTS.PAYMENT_FAILED, {
				event: RAZORPAY_WEBHOOK_EVENTS.PAYMENT_FAILED,
				payload: {
					payment: {
						entity: {
							id: 'pay_fail_2',
							order_id: 'order_food_fail',
							status: 'failed',
							amount: 50000,
							error_reason: 'payment_cancelled',
						},
					},
				},
			});

			expect(mockTxRepo.failOrderPaymentWithOutbox).toHaveBeenCalledWith(
				expect.objectContaining({
					outbox: expect.objectContaining({
						eventType: PAYMENT_EVENTS.ORDER_FAILED,
						aggregateId: 'food-order-1',
						payload: expect.objectContaining({ failureReason: 'payment_cancelled' }),
					}),
				}),
			);
			expect(mockOutboxRelay.processPendingEvents).toHaveBeenCalledTimes(1);
		});
	});
});
