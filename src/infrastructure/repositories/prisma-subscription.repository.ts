import { Subscription } from '@domain/entities/subscription.entity.ts';
import type {
	CreateSubscriptionInput,
	ISubscriptionRepository,
} from '@domain/repositories/subscription.repository.interface.ts';
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
					status: 'SUCCESS',
					razorpayPaymentId: params.payment.razorpayPaymentId,
					razorpaySignature: params.payment.razorpaySignature,
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
