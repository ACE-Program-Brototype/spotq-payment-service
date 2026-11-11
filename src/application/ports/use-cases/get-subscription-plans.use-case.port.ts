import type { SubscriptionPlanOutput } from '@application/dtos/get-subscription-plans.dto.ts';

export interface IGetSubscriptionPlansUseCase {
	execute(): Promise<SubscriptionPlanOutput[]>;
}
