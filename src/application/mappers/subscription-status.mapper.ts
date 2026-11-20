import type { SubscriptionStatusOutput } from '@application/dtos/get-subscription-status.dto.ts';
import type { Subscription } from '@domain/entities/subscription.entity.ts';
import type { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';

export const SubscriptionStatusMapper = {
	toInactiveResponse(): SubscriptionStatusOutput {
		return {
			isSubscriptionActive: false,
			subscription: null,
		};
	},

	toActiveResponse(
		subscription: Subscription,
		plan?: SubscriptionPlan | null,
	): SubscriptionStatusOutput {
		return {
			isSubscriptionActive: true,
			subscription: {
				id: subscription.id,
				status: subscription.status,
				planCode: plan?.code,
				planName: plan?.name,
				currentPeriodStart: subscription.currentPeriodStart.toISOString(),
				currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
			},
		};
	},
};
