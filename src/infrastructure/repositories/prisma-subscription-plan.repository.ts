import type { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { SubscriptionPlanPersistenceMapper } from '@infrastructure/mappers/subscription-plan.persistence-mapper.ts';
import type { Prisma, SubscriptionPlan as PrismaSubscriptionPlan } from '@prisma/client';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaSubscriptionPlanRepository
	extends PrismaBaseRepository<
		SubscriptionPlan,
		PrismaSubscriptionPlan,
		Prisma.SubscriptionPlanWhereInput,
		unknown,
		unknown,
		Prisma.SubscriptionPlanUncheckedCreateInput,
		Prisma.SubscriptionPlanUncheckedUpdateInput
	>
	implements ISubscriptionPlanRepository
{
	protected override getModel() {
		return this.prisma.subscriptionPlan;
	}

	protected override mapToDomain(record: PrismaSubscriptionPlan): SubscriptionPlan {
		return SubscriptionPlanPersistenceMapper.toDomain(record);
	}

	async findAllActive(): Promise<SubscriptionPlan[]> {
		return this.find({
			where: { isActive: true },
			orderBy: { pricePaise: 'asc' },
		});
	}

	async findByCode(code: string): Promise<SubscriptionPlan | null> {
		return this.executePrisma(async () => {
			const record = await this.prisma.subscriptionPlan.findUnique({
				where: { code },
			});

			return record ? this.mapToDomain(record) : null;
		});
	}
}
