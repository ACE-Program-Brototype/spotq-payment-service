import type { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';

export class GetSubscriptionPlansUseCase {
	constructor(private readonly planRepository: ISubscriptionPlanRepository) {}

	async execute(): Promise<SubscriptionPlan[]> {
		return this.planRepository.findAllActive();
	}
}
