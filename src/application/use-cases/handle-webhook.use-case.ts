import { config } from '@config/index.ts';
import { prisma } from '@infrastructure/database/prisma.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { outboxRelayService } from '@infrastructure/outbox/outbox-relay.service.ts';
import type { RazorpayGateway } from '@infrastructure/payment/razorpay.gateway.ts';
import type { Prisma } from '@prisma/client';

export interface WebhookPayload {
	event: string;
	payload?: {
		payment?: {
			entity?: {
				id: string;
				order_id: string;
				status: string;
				amount: number;
			};
		};
		order?: {
			entity?: {
				id: string;
				status: string;
			};
		};
	};
}

export class HandleWebhookUseCase {
	constructor(private readonly razorpayGateway: RazorpayGateway) {}

	async execute(params: {
		rawBody: string;
		signature: string;
		parsedPayload: WebhookPayload;
	}): Promise<{ received: boolean }> {
		const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || config.razorpay.keySecret;

		// 1. Verify Webhook Signature
		if (webhookSecret && params.signature) {
			const isValid = this.razorpayGateway.verifyWebhookSignature(
				params.rawBody,
				params.signature,
				webhookSecret,
			);

			if (!isValid) {
				logger.warn('Invalid webhook signature rejected');
				return { received: false };
			}
		}

		const eventType = params.parsedPayload.event;
		const paymentEntity = params.parsedPayload.payload?.payment?.entity;

		logger.info({ eventType, paymentId: paymentEntity?.id }, 'Processing Razorpay webhook event');

		// 2. Handle payment.captured / order.paid
		if (eventType === 'payment.captured' && paymentEntity) {
			const orderId = paymentEntity.order_id;
			const paymentId = paymentEntity.id;

			if (!orderId) {
				return { received: true };
			}

			const existingTx = await prisma.paymentTransaction.findUnique({
				where: { razorpayOrderId: orderId },
				include: { plan: true, subscription: true },
			});

			if (!existingTx) {
				logger.warn({ orderId }, 'Payment order not found for webhook event');
				return { received: true };
			}

			// Idempotent: If already processed, ignore
			if (existingTx.status === 'SUCCESS' && existingTx.subscription) {
				logger.info({ orderId }, 'Webhook received for already completed transaction');
				return { received: true };
			}

			const plan = existingTx.plan;
			if (!plan) return { received: true };

			const now = new Date();
			const currentPeriodEnd = new Date(now);
			if (plan.billingCycle === 'YEARLY') {
				currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
			} else {
				currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
			}

			await prisma.$transaction(async (tx) => {
				const subscription = await tx.subscription.create({
					data: {
						restaurantId: existingTx.restaurantId,
						planId: plan.id,
						status: 'ACTIVE',
						currentPeriodStart: now,
						currentPeriodEnd: currentPeriodEnd,
					},
				});

				await tx.paymentTransaction.update({
					where: { id: existingTx.id },
					data: {
						status: 'SUCCESS',
						razorpayPaymentId: paymentId,
						subscriptionId: subscription.id,
					},
				});

				await tx.outboxEvent.create({
					data: {
						eventType: 'subscription.activated',
						aggregateId: existingTx.restaurantId,
						payload: {
							subscriptionId: subscription.id,
							restaurantId: existingTx.restaurantId,
							planCode: plan.code,
							status: 'ACTIVE',
							currentPeriodStart: now.toISOString(),
							currentPeriodEnd: currentPeriodEnd.toISOString(),
							timestamp: now.toISOString(),
						} as unknown as Prisma.InputJsonValue,
						status: 'PENDING',
					},
				});
			});

			outboxRelayService.processPendingEvents().catch((err) => {
				logger.error({ err }, 'Error triggering outbox relay after webhook');
			});
		}

		return { received: true };
	}
}
