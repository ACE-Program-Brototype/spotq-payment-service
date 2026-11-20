import { Subscription, type SubscriptionProps } from '@domain/entities/subscription.entity.ts';

export const SubscriptionPersistenceMapper = {
	toDomain(record: SubscriptionProps): Subscription {
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
};
