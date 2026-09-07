import type { SubscriptionPlan } from '../entities/subscription-plan.entity.ts';

export interface ISubscriptionPlanRepository {
	findAllActive(): Promise<SubscriptionPlan[]>;
	findById(id: string): Promise<SubscriptionPlan | null>;
	findByCode(code: string): Promise<SubscriptionPlan | null>;
}
