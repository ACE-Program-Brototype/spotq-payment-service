import type { SubscriptionStatusOutput } from '@application/dtos/get-subscription-status.dto.ts';
import type { IGetSubscriptionStatusUseCase } from '@application/ports/use-cases/get-subscription-status.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { inject, injectable } from 'inversify';

/**
 * Use case responsible for checking active subscription status for a restaurant.
 */
@injectable()
export class GetSubscriptionStatusUseCase implements IGetSubscriptionStatusUseCase {
	constructor(
		@inject(TYPES.Repositories.SubscriptionRepository)
		private readonly subscriptionRepository: ISubscriptionRepository,
		@inject(TYPES.Repositories.SubscriptionPlanRepository)
		private readonly planRepository: ISubscriptionPlanRepository,
	) {}

	async execute(restaurantId: string): Promise<SubscriptionStatusOutput> {
		if (!restaurantId) {
			return {
				isSubscriptionActive: false,
				subscription: null,
			};
		}

		const activeSub = await this.subscriptionRepository.findActiveByRestaurantId(restaurantId);
		if (!activeSub?.isActive()) {
			return {
				isSubscriptionActive: false,
				subscription: null,
			};
		}

		const plan = await this.planRepository.findById(activeSub.planId);

		return {
			isSubscriptionActive: true,
			subscription: {
				id: activeSub.id,
				status: activeSub.status,
				planCode: plan?.code,
				planName: plan?.name,
				currentPeriodStart: activeSub.currentPeriodStart.toISOString(),
				currentPeriodEnd: activeSub.currentPeriodEnd.toISOString(),
			},
		};
	}
}
