import type { SubscriptionPlanOutput } from '@application/dtos/get-subscription-plans.dto.ts';
import type { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';

/**
 * Application mapper converting SubscriptionPlan domain entities into DTO responses.
 */
export const SubscriptionPlanMapper = {
	toOutputDTO(plan: SubscriptionPlan): SubscriptionPlanOutput {
		return {
			id: plan.id,
			code: plan.code,
			name: plan.name,
			description: plan.description,
			pricePaise: plan.pricePaise,
			priceInRupees: plan.priceInRupees,
			currency: plan.currency,
			billingCycle: plan.billingCycle,
			features: plan.features,
			isActive: plan.isActive,
		};
	},

	toOutputList(plans: SubscriptionPlan[]): SubscriptionPlanOutput[] {
		return plans.map((plan) => this.toOutputDTO(plan));
	},
};
