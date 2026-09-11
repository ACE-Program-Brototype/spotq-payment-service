import type { SubscriptionPlan } from '../entities/subscription-plan.entity.ts';
import type { IBaseRepository } from './base.repository.interface.ts';

export interface ISubscriptionPlanRepository extends IBaseRepository<SubscriptionPlan> {
	findAllActive(): Promise<SubscriptionPlan[]>;
	findByCode(code: string): Promise<SubscriptionPlan | null>;
}
