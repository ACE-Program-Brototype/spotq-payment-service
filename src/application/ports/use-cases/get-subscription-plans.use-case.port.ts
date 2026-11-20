import type { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';

export interface IGetSubscriptionPlansUseCase {
	execute(): Promise<SubscriptionPlan[]>;
}
