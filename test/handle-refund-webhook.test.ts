import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import { HandleWebhookUseCase } from '@application/use-cases/handle-webhook.use-case.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { RAZORPAY_WEBHOOK_EVENTS, REFUND_STATUS } from '@shared/constants/index.ts';

describe('HandleWebhookUseCase - Refund Events', () => {
	let mockGateway: jest.Mocked<IPaymentGateway>;
	let mockTxRepo: jest.Mocked<IPaymentTransactionRepository>;
	let mockPlanRepo: jest.Mocked<ISubscriptionPlanRepository>;
	let mockSubscriptionRepo: jest.Mocked<ISubscriptionRepository>;
	let mockOutboxRelay: jest.Mocked<IOutboxRelayService>;
	let useCase: HandleWebhookUseCase;

	beforeEach(() => {
		mockGateway = {
			initialize: jest.fn().mockResolvedValue(undefined),
			isHealthy: jest.fn().mockReturnValue(true),
			createOrder: jest.fn(),
			verifyPaymentSignature: jest.fn().mockReturnValue(true),
			verifyWebhookSignature: jest.fn().mockReturnValue(true),
			getPaymentDetails: jest.fn(),
			createRefund: jest.fn(),
		} as unknown as jest.Mocked<IPaymentGateway>;

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
			syncRefundFromWebhook: jest.fn().mockResolvedValue(undefined),
			markSuccess: jest.fn(),
			markFailed: jest.fn(),
			resetToCreated: jest.fn(),
		};

		mockPlanRepo = {
			findById: jest.fn(),
			findByCode: jest.fn(),
			findAllActive: jest.fn(),
		};

		mockSubscriptionRepo = {
			findById: jest.fn(),
			findActiveByRestaurantId: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			activateSubscriptionWithOutbox: jest.fn(),
			findSubscribersPaginated: jest.fn(),
			findSubscriberDetailById: jest.fn(),
			renewSubscriptionWithOutbox: jest.fn(),
		};

		mockOutboxRelay = {
			start: jest.fn(),
			stop: jest.fn(),
			processPendingEvents: jest.fn().mockResolvedValue(undefined),
			replayDeadLetterEvent: jest.fn(),
		} as unknown as jest.Mocked<IOutboxRelayService>;

		useCase = new HandleWebhookUseCase(
			mockGateway,
			mockTxRepo,
			mockPlanRepo,
			mockSubscriptionRepo,
			mockOutboxRelay,
		);
	});

	it('should process refund.processed webhook and call syncRefundFromWebhook with PROCESSED and ARN', async () => {
		const result = await useCase.execute({
			rawBody: JSON.stringify({ event: RAZORPAY_WEBHOOK_EVENTS.REFUND_PROCESSED }),
			signature: 'valid_signature',
			parsedPayload: {
				event: RAZORPAY_WEBHOOK_EVENTS.REFUND_PROCESSED,
				payload: {
					refund: {
						entity: {
							id: 'rfnd_OEd92m8F05s9jKa',
							payment_id: 'pay_OEd92m8F05s9jKa',
							amount: 86800,
							currency: 'INR',
							status: 'processed',
							arn: '123456789012',
							notes: { reason: 'CUSTOMER_CANCELLED' },
						},
					},
					payment: {
						entity: {
							id: 'pay_OEd92m8F05s9jKa',
							order_id: 'order_123',
							status: 'refunded',
							amount: 86800,
						},
					},
				},
			},
		});

		expect(result).toEqual({ received: true });
		expect(mockTxRepo.syncRefundFromWebhook).toHaveBeenCalledWith({
			razorpayRefundId: 'rfnd_OEd92m8F05s9jKa',
			razorpayPaymentId: 'pay_OEd92m8F05s9jKa',
			status: REFUND_STATUS.PROCESSED,
			amountPaise: 86800,
			currency: 'INR',
			arn: '123456789012',
			reason: 'CUSTOMER_CANCELLED',
		});
	});

	it('should process refund.failed webhook and call syncRefundFromWebhook with FAILED status', async () => {
		const result = await useCase.execute({
			rawBody: JSON.stringify({ event: RAZORPAY_WEBHOOK_EVENTS.REFUND_FAILED }),
			signature: 'valid_signature',
			parsedPayload: {
				event: RAZORPAY_WEBHOOK_EVENTS.REFUND_FAILED,
				payload: {
					refund: {
						entity: {
							id: 'rfnd_OEd92m8F05s9jKa',
							payment_id: 'pay_OEd92m8F05s9jKa',
							amount: 86800,
							currency: 'INR',
							status: 'failed',
						},
					},
				},
			},
		});

		expect(result).toEqual({ received: true });
		expect(mockTxRepo.syncRefundFromWebhook).toHaveBeenCalledWith({
			razorpayRefundId: 'rfnd_OEd92m8F05s9jKa',
			razorpayPaymentId: 'pay_OEd92m8F05s9jKa',
			status: REFUND_STATUS.FAILED,
			amountPaise: 86800,
			currency: 'INR',
			arn: null,
			reason: null,
		});
	});

	it('should reject webhook with received: false when signature verification fails', async () => {
		mockGateway.verifyWebhookSignature.mockReturnValue(false);

		const result = await useCase.execute({
			rawBody: 'invalid_raw_body',
			signature: 'invalid_signature',
			parsedPayload: {
				event: RAZORPAY_WEBHOOK_EVENTS.REFUND_PROCESSED,
				payload: {
					refund: {
						entity: {
							id: 'rfnd_123',
						},
					},
				},
			},
		});

		expect(result).toEqual({ received: false });
		expect(mockTxRepo.syncRefundFromWebhook).not.toHaveBeenCalled();
	});

	it('should acknowledge without syncing when refund entity id is missing', async () => {
		const result = await useCase.execute({
			rawBody: JSON.stringify({ event: RAZORPAY_WEBHOOK_EVENTS.REFUND_PROCESSED }),
			signature: 'valid_signature',
			parsedPayload: {
				event: RAZORPAY_WEBHOOK_EVENTS.REFUND_PROCESSED,
				payload: {},
			},
		});

		expect(result).toEqual({ received: true });
		expect(mockTxRepo.syncRefundFromWebhook).not.toHaveBeenCalled();
	});
});
