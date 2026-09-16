import type {
	VerifyPaymentInput,
	VerifyPaymentOutput,
} from '@application/dtos/verify-payment.dto.ts';
import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { IVerifyPaymentUseCase } from '@application/ports/use-cases/verify-payment.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	InvalidPaymentSignatureError,
	PaymentOrderNotFoundError,
	PlanNotFoundError,
	UnauthorizedRestaurantError,
} from '@domain/errors/payment.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	PAYMENT_STATUS,
	SUBSCRIPTION_EVENTS,
	SUBSCRIPTION_STATUS,
} from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

/**
 * Use case responsible for verifying Razorpay payment signatures,
 * activating restaurant subscriptions, and dispatching outbox activation events.
 */
@injectable()
export class VerifyPaymentUseCase implements IVerifyPaymentUseCase {
	constructor(
		@inject(TYPES.Gateways.PaymentGateway)
		private readonly paymentGateway: IPaymentGateway,
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
		@inject(TYPES.Repositories.SubscriptionPlanRepository)
		private readonly planRepository: ISubscriptionPlanRepository,
		@inject(TYPES.Repositories.SubscriptionRepository)
		private readonly subscriptionRepository: ISubscriptionRepository,
		@inject(TYPES.Services.OutboxRelayService)
		private readonly outboxRelayService: IOutboxRelayService,
	) {}

	async execute(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
		const isSignatureValid = this.paymentGateway.verifyPaymentSignature({
			orderId: input.razorpayOrderId,
			paymentId: input.razorpayPaymentId,
			signature: input.razorpaySignature,
		});

		if (!isSignatureValid) {
			logger.warn(
				{ orderId: input.razorpayOrderId, paymentId: input.razorpayPaymentId },
				'Payment signature verification failed',
			);
			throw new InvalidPaymentSignatureError();
		}

		const existingTx = await this.paymentTransactionRepository.findByOrderId(input.razorpayOrderId);

		if (!existingTx) {
			throw new PaymentOrderNotFoundError();
		}

		if (input.restaurantId && existingTx.restaurantId !== input.restaurantId) {
			logger.warn(
				{
					orderId: input.razorpayOrderId,
					expectedRestaurantId: existingTx.restaurantId,
					callerRestaurantId: input.restaurantId,
				},
				'Restaurant authorization mismatch on verify payment',
			);
			throw new UnauthorizedRestaurantError();
		}

		if (existingTx.status === PAYMENT_STATUS.SUCCESS && existingTx.subscriptionId) {
			logger.info(
				{ orderId: input.razorpayOrderId, subscriptionId: existingTx.subscriptionId },
				'Payment already verified and subscription activated. Returning idempotently.',
			);

			const existingSub = await this.subscriptionRepository.findById(existingTx.subscriptionId);
			const plan = await this.planRepository.findById(existingTx.planId);

			return {
				subscriptionId: existingTx.subscriptionId,
				restaurantId: existingTx.restaurantId,
				planCode: plan?.code || '',
				status: existingSub?.status || SUBSCRIPTION_STATUS.ACTIVE,
				currentPeriodStart:
					existingSub?.currentPeriodStart.toISOString() || new Date().toISOString(),
				currentPeriodEnd: existingSub?.currentPeriodEnd.toISOString() || new Date().toISOString(),
			};
		}

		const plan = await this.planRepository.findById(existingTx.planId);
		if (!plan) {
			throw new PlanNotFoundError();
		}

		const now = new Date();
		const currentPeriodEnd = plan.calculatePeriodEnd(now);

		const subscription = await this.subscriptionRepository.activateSubscriptionWithOutbox({
			subscription: {
				restaurantId: existingTx.restaurantId,
				planId: plan.id,
				status: SUBSCRIPTION_STATUS.ACTIVE,
				currentPeriodStart: now,
				currentPeriodEnd: currentPeriodEnd,
			},
			payment: {
				razorpayOrderId: existingTx.razorpayOrderId,
				razorpayPaymentId: input.razorpayPaymentId,
				razorpaySignature: input.razorpaySignature,
			},
			outbox: {
				eventType: SUBSCRIPTION_EVENTS.ACTIVATED,
				aggregateId: existingTx.restaurantId,
				payload: {
					restaurantId: existingTx.restaurantId,
					planCode: plan.code,
					status: SUBSCRIPTION_STATUS.ACTIVE,
					currentPeriodStart: now.toISOString(),
					currentPeriodEnd: currentPeriodEnd.toISOString(),
					timestamp: now.toISOString(),
				},
			},
		});

		logger.info(
			{
				subscriptionId: subscription.id,
				restaurantId: existingTx.restaurantId,
				planCode: plan.code,
			},
			'Subscription activated atomically with Outbox Event',
		);

		this.outboxRelayService.processPendingEvents().catch((err) => {
			logger.error({ err }, 'Background outbox dispatch trigger error');
		});

		return {
			subscriptionId: subscription.id,
			restaurantId: existingTx.restaurantId,
			planCode: plan.code,
			status: subscription.status,
			currentPeriodStart: subscription.currentPeriodStart.toISOString(),
			currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
		};
	}
}
