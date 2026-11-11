import type { SubscriptionPlanOutput } from '@application/dtos/get-subscription-plans.dto.ts';
import { SubscriptionPlanMapper } from '@application/mappers/subscriptions/subscription-plan.mapper.ts';
import type { IGetSubscriptionPlansUseCase } from '@application/ports/use-cases/get-subscription-plans.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { inject, injectable } from 'inversify';

/**
 * Use case responsible for retrieving all active subscription plans available for restaurants.
 */
@injectable()
export class GetSubscriptionPlansUseCase implements IGetSubscriptionPlansUseCase {
	constructor(
		@inject(TYPES.Repositories.SubscriptionPlanRepository)
		private readonly planRepository: ISubscriptionPlanRepository,
	) {}

	async execute(): Promise<SubscriptionPlanOutput[]> {
		const plans = await this.planRepository.findAllActive();
		return SubscriptionPlanMapper.toOutputList(plans);
	}
}
