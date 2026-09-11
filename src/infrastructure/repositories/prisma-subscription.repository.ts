import { Subscription } from '@domain/entities/subscription.entity.ts';
import type {
	CreateSubscriptionInput,
	ISubscriptionRepository,
} from '@domain/repositories/subscription.repository.interface.ts';
import { PAYMENT_STATUS } from '@shared/constants/index.ts';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaSubscriptionRepository
	extends PrismaBaseRepository
	implements ISubscriptionRepository
{
	async findActiveByRestaurantId(restaurantId: string): Promise<Subscription | null> {
		const now = new Date();
		const record = await this.prisma.subscription.findFirst({
			where: {
				restaurantId,
				status: 'ACTIVE',
				currentPeriodEnd: { gte: now },
			},
			orderBy: { currentPeriodEnd: 'desc' },
		});

		if (!record) return null;

		return new Subscription({
			id: record.id,
			restaurantId: record.restaurantId,
			planId: record.planId,
			status: record.status,
			currentPeriodStart: record.currentPeriodStart,
			currentPeriodEnd: record.currentPeriodEnd,
			canceledAt: record.canceledAt,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	}

	async findById(id: string): Promise<Subscription | null> {
		const record = await this.prisma.subscription.findUnique({
			where: { id },
		});

		if (!record) return null;

		return new Subscription({
			id: record.id,
			restaurantId: record.restaurantId,
			planId: record.planId,
			status: record.status,
			currentPeriodStart: record.currentPeriodStart,
			currentPeriodEnd: record.currentPeriodEnd,
			canceledAt: record.canceledAt,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	}

	async create(data: CreateSubscriptionInput): Promise<Subscription> {
		const record = await this.prisma.subscription.create({
			data: {
				restaurantId: data.restaurantId,
				planId: data.planId,
				status: data.status,
				currentPeriodStart: data.currentPeriodStart,
				currentPeriodEnd: data.currentPeriodEnd,
			},
		});

		return new Subscription({
			id: record.id,
			restaurantId: record.restaurantId,
			planId: record.planId,
			status: record.status,
			currentPeriodStart: record.currentPeriodStart,
			currentPeriodEnd: record.currentPeriodEnd,
			canceledAt: record.canceledAt,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	}

	async activateSubscriptionWithOutbox(params: {
		subscription: CreateSubscriptionInput;
		payment: {
			razorpayOrderId: string;
			razorpayPaymentId: string;
			razorpaySignature: string;
		};
		outbox: {
			eventType: string;
			aggregateId: string;
			payload: Record<string, unknown>;
		};
	}): Promise<Subscription> {
		return this.prisma.$transaction(async (tx) => {
			const existingTx = await tx.paymentTransaction.findUnique({
				where: { razorpayOrderId: params.payment.razorpayOrderId },
			});

			if (existingTx?.status === PAYMENT_STATUS.SUCCESS && existingTx.subscriptionId) {
				const existingSub = await tx.subscription.findUnique({
					where: { id: existingTx.subscriptionId },
				});
				if (existingSub) {
					return new Subscription({
						id: existingSub.id,
						restaurantId: existingSub.restaurantId,
						planId: existingSub.planId,
						status: existingSub.status,
						currentPeriodStart: existingSub.currentPeriodStart,
						currentPeriodEnd: existingSub.currentPeriodEnd,
						canceledAt: existingSub.canceledAt,
						createdAt: existingSub.createdAt,
						updatedAt: existingSub.updatedAt,
					});
				}
			}

			const updateResult = await tx.paymentTransaction.updateMany({
				where: {
					razorpayOrderId: params.payment.razorpayOrderId,
					status: { not: PAYMENT_STATUS.SUCCESS },
				},
				data: {
					status: PAYMENT_STATUS.SUCCESS,
					razorpayPaymentId: params.payment.razorpayPaymentId,
					razorpaySignature: params.payment.razorpaySignature,
				},
			});

			if (updateResult.count === 0) {
				const updatedTx = await tx.paymentTransaction.findUnique({
					where: { razorpayOrderId: params.payment.razorpayOrderId },
				});
				if (updatedTx?.subscriptionId) {
					const existingSub = await tx.subscription.findUnique({
						where: { id: updatedTx.subscriptionId },
					});
					if (existingSub) {
						return new Subscription({
							id: existingSub.id,
							restaurantId: existingSub.restaurantId,
							planId: existingSub.planId,
							status: existingSub.status,
							currentPeriodStart: existingSub.currentPeriodStart,
							currentPeriodEnd: existingSub.currentPeriodEnd,
							canceledAt: existingSub.canceledAt,
							createdAt: existingSub.createdAt,
							updatedAt: existingSub.updatedAt,
						});
					}
				}
			}

			const subRecord = await tx.subscription.create({
				data: {
					restaurantId: params.subscription.restaurantId,
					planId: params.subscription.planId,
					status: params.subscription.status,
					currentPeriodStart: params.subscription.currentPeriodStart,
					currentPeriodEnd: params.subscription.currentPeriodEnd,
				},
			});

			await tx.paymentTransaction.update({
				where: { razorpayOrderId: params.payment.razorpayOrderId },
				data: {
					subscriptionId: subRecord.id,
				},
			});

			await tx.outboxEvent.create({
				data: {
					eventType: params.outbox.eventType,
					aggregateId: params.outbox.aggregateId,
					payload: {
						...params.outbox.payload,
						subscriptionId: subRecord.id,
					},
					status: 'PENDING',
				},
			});

			return new Subscription({
				id: subRecord.id,
				restaurantId: subRecord.restaurantId,
				planId: subRecord.planId,
				status: subRecord.status,
				currentPeriodStart: subRecord.currentPeriodStart,
				currentPeriodEnd: subRecord.currentPeriodEnd,
				canceledAt: subRecord.canceledAt,
				createdAt: subRecord.createdAt,
				updatedAt: subRecord.updatedAt,
			});
		});
	}
}
