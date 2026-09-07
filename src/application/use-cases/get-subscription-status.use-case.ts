import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';

export interface SubscriptionStatusOutput {
	isSubscriptionActive: boolean;
	subscription: {
		id: string;
		status: string;
		planCode?: string;
		planName?: string;
		currentPeriodStart?: string;
		currentPeriodEnd?: string;
	} | null;
}

export class GetSubscriptionStatusUseCase {
	constructor(
		private readonly subscriptionRepository: ISubscriptionRepository,
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
