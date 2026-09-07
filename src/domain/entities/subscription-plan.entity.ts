import type { PlanBillingCycle } from '@prisma/client';

export interface SubscriptionPlanProps {
	id: string;
	code: string;
	name: string;
	description?: string | null;
	pricePaise: number;
	currency: string;
	billingCycle: PlanBillingCycle;
	features: string[];
	isActive: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}

export class SubscriptionPlan {
	constructor(private readonly props: SubscriptionPlanProps) {}

	get id(): string {
		return this.props.id;
	}

	get code(): string {
		return this.props.code;
	}

	get name(): string {
		return this.props.name;
	}

	get description(): string | null | undefined {
		return this.props.description;
	}

	get pricePaise(): number {
		return this.props.pricePaise;
	}

	get priceInRupees(): number {
		return this.props.pricePaise / 100;
	}

	get currency(): string {
		return this.props.currency;
	}

	get billingCycle(): PlanBillingCycle {
		return this.props.billingCycle;
	}

	get features(): string[] {
		return this.props.features;
	}

	get isActive(): boolean {
		return this.props.isActive;
	}

	toJSON() {
		return {
			id: this.id,
			code: this.code,
			name: this.name,
			description: this.description,
			pricePaise: this.pricePaise,
			priceInRupees: this.priceInRupees,
			currency: this.currency,
			billingCycle: this.billingCycle,
			features: this.features,
			isActive: this.isActive,
		};
	}
}
