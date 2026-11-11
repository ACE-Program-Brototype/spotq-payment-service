import { Subscription } from '@domain/entities/subscription.entity.ts';
import type {
	CreateSubscriptionInput,
	UpdateSubscriptionInput,
} from '@domain/repositories/subscription.repository.interface.ts';
import type { Prisma, Subscription as PrismaSubscription } from '@prisma/client';

/**
 * Persistence mapper converting Subscription entities and inputs to and from Prisma records.
 */
export const SubscriptionPersistenceMapper = {
	toDomain(record: PrismaSubscription): Subscription {
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
	},

	toCreatePersistence(data: CreateSubscriptionInput): Prisma.SubscriptionUncheckedCreateInput {
		return {
			restaurantId: data.restaurantId,
			planId: data.planId,
			status: data.status,
			currentPeriodStart: data.currentPeriodStart,
			currentPeriodEnd: data.currentPeriodEnd,
		};
	},

	toUpdatePersistence(data: UpdateSubscriptionInput): Prisma.SubscriptionUncheckedUpdateInput {
		return {
			...(data.status !== undefined && { status: data.status }),
			...(data.currentPeriodStart !== undefined && { currentPeriodStart: data.currentPeriodStart }),
			...(data.currentPeriodEnd !== undefined && { currentPeriodEnd: data.currentPeriodEnd }),
			...(data.canceledAt !== undefined && { canceledAt: data.canceledAt }),
		};
	},
};
