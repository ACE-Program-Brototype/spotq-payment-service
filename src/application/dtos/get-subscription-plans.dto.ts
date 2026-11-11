import type { PlanBillingCycle } from '@domain/entities/subscription-plan.entity.ts';

export interface SubscriptionPlanOutput {
	id: string;
	code: string;
	name: string;
	description?: string | null;
	pricePaise: number;
	priceInRupees: number;
	currency: string;
	billingCycle: PlanBillingCycle;
	features: string[];
	isActive: boolean;
}
