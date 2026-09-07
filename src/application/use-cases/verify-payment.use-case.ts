import {
	InvalidPaymentSignatureError,
	PaymentOrderNotFoundError,
	PlanNotFoundError,
} from '@domain/errors/payment.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import { prisma } from '@infrastructure/database/prisma.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { outboxRelayService } from '@infrastructure/outbox/outbox-relay.service.ts';
import type { Prisma } from '@prisma/client';

export interface VerifyPaymentInput {
	razorpayOrderId: string;
	razorpayPaymentId: string;
	razorpaySignature: string;
	restaurantId?: string;
}

export interface VerifyPaymentOutput {
	subscriptionId: string;
	restaurantId: string;
	planCode: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
}

export class VerifyPaymentUseCase {
	constructor(private readonly paymentGateway: IPaymentGateway) {}

	async execute(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
		// 1. Verify cryptographic signature
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

		// 2. Fetch existing payment transaction
		const existingTx = await prisma.paymentTransaction.findUnique({
			where: { razorpayOrderId: input.razorpayOrderId },
			include: { plan: true, subscription: true },
		});

		if (!existingTx) {
			throw new PaymentOrderNotFoundError();
		}

		// 3. Idempotency check: If already SUCCESS, return existing subscription
		if (existingTx.status === 'SUCCESS' && existingTx.subscription) {
			logger.info(
				{ orderId: input.razorpayOrderId, subscriptionId: existingTx.subscription.id },
				'Payment already verified and subscription activated. Returning idempotently.',
			);

			return {
				subscriptionId: existingTx.subscription.id,
				restaurantId: existingTx.restaurantId,
				planCode: existingTx.plan.code,
				status: existingTx.subscription.status,
				currentPeriodStart: existingTx.subscription.currentPeriodStart.toISOString(),
				currentPeriodEnd: existingTx.subscription.currentPeriodEnd.toISOString(),
			};
		}

		const plan = existingTx.plan;
		if (!plan) {
			throw new PlanNotFoundError();
		}

		const now = new Date();
		const currentPeriodEnd = new Date(now);
		if (plan.billingCycle === 'YEARLY') {
			currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
		} else {
			currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
		}

		// 4. Atomic Execution: Update Payment + Create Subscription + Save Outbox Event
		const result = await prisma.$transaction(async (tx) => {
			// Create active subscription
			const subscription = await tx.subscription.create({
				data: {
					restaurantId: existingTx.restaurantId,
					planId: plan.id,
					status: 'ACTIVE',
					currentPeriodStart: now,
					currentPeriodEnd: currentPeriodEnd,
				},
			});

			// Update transaction to SUCCESS
			await tx.paymentTransaction.update({
				where: { id: existingTx.id },
				data: {
					status: 'SUCCESS',
					razorpayPaymentId: input.razorpayPaymentId,
					razorpaySignature: input.razorpaySignature,
					subscriptionId: subscription.id,
				},
			});

			// Write event into Outbox Table
			const outboxPayload = {
				subscriptionId: subscription.id,
				restaurantId: existingTx.restaurantId,
				planCode: plan.code,
				status: 'ACTIVE',
				currentPeriodStart: now.toISOString(),
				currentPeriodEnd: currentPeriodEnd.toISOString(),
				timestamp: now.toISOString(),
			};

			await tx.outboxEvent.create({
				data: {
					eventType: 'subscription.activated',
					aggregateId: existingTx.restaurantId,
					payload: outboxPayload as unknown as Prisma.InputJsonValue,
					status: 'PENDING',
				},
			});

			return { subscription, planCode: plan.code };
		});

		logger.info(
			{
				subscriptionId: result.subscription.id,
				restaurantId: existingTx.restaurantId,
				planCode: result.planCode,
			},
			'Subscription activated atomically with Outbox Event',
		);

		// 5. Trigger outbox relay in background
		outboxRelayService.processPendingEvents().catch((err) => {
			logger.error({ err }, 'Background outbox dispatch trigger error');
		});

		return {
			subscriptionId: result.subscription.id,
			restaurantId: existingTx.restaurantId,
			planCode: result.planCode,
			status: result.subscription.status,
			currentPeriodStart: result.subscription.currentPeriodStart.toISOString(),
			currentPeriodEnd: result.subscription.currentPeriodEnd.toISOString(),
		};
	}
}
