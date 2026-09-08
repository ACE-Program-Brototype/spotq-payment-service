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
}

export const subscriptionRepository = new PrismaSubscriptionRepository();
