import { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaSubscriptionPlanRepository
	extends PrismaBaseRepository
	implements ISubscriptionPlanRepository
{
	async findAllActive(): Promise<SubscriptionPlan[]> {
		const records = await this.prisma.subscriptionPlan.findMany({
			where: { isActive: true },
			orderBy: { pricePaise: 'asc' },
		});

		return records.map(
			(r) =>
				new SubscriptionPlan({
					id: r.id,
					code: r.code,
					name: r.name,
					description: r.description,
					pricePaise: r.pricePaise,
					currency: r.currency,
					billingCycle: r.billingCycle,
					features: (r.features as string[]) || [],
					isActive: r.isActive,
					createdAt: r.createdAt,
					updatedAt: r.updatedAt,
				}),
		);
	}

	async findById(id: string): Promise<SubscriptionPlan | null> {
		const record = await this.prisma.subscriptionPlan.findUnique({
			where: { id },
		});

		if (!record) return null;

		return new SubscriptionPlan({
			id: record.id,
			code: record.code,
			name: record.name,
			description: record.description,
			pricePaise: record.pricePaise,
			currency: record.currency,
			billingCycle: record.billingCycle,
			features: (record.features as string[]) || [],
			isActive: record.isActive,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	}

	async findByCode(code: string): Promise<SubscriptionPlan | null> {
		const record = await this.prisma.subscriptionPlan.findUnique({
			where: { code },
		});

		if (!record) return null;

		return new SubscriptionPlan({
			id: record.id,
			code: record.code,
			name: record.name,
			description: record.description,
			pricePaise: record.pricePaise,
			currency: record.currency,
			billingCycle: record.billingCycle,
			features: (record.features as string[]) || [],
			isActive: record.isActive,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	}
}
