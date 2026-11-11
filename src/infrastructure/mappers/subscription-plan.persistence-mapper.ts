import { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import type { SubscriptionPlan as PrismaSubscriptionPlan } from '@prisma/client';

/**
 * Persistence mapper converting Prisma SubscriptionPlan records into domain entities.
 */
export const SubscriptionPlanPersistenceMapper = {
	toDomain(record: PrismaSubscriptionPlan): SubscriptionPlan {
		return new SubscriptionPlan({
			id: record.id,
			code: record.code,
			name: record.name,
			description: record.description,
			pricePaise: record.pricePaise,
			currency: record.currency,
			billingCycle: record.billingCycle,
			features: Array.isArray(record.features) ? (record.features as string[]) : [],
			isActive: record.isActive,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	},
};
