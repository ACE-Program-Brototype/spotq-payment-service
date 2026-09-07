import type { SubscriptionStatus } from '@prisma/client';

export interface SubscriptionProps {
	id: string;
	restaurantId: string;
	planId: string;
	status: SubscriptionStatus;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	canceledAt?: Date | null;
	createdAt?: Date;
	updatedAt?: Date;
}

export class Subscription {
	constructor(private readonly props: SubscriptionProps) {}

	get id(): string {
		return this.props.id;
	}

	get restaurantId(): string {
		return this.props.restaurantId;
	}

	get planId(): string {
		return this.props.planId;
	}

	get status(): SubscriptionStatus {
		return this.props.status;
	}

	get currentPeriodStart(): Date {
		return this.props.currentPeriodStart;
	}

	get currentPeriodEnd(): Date {
		return this.props.currentPeriodEnd;
	}

	get canceledAt(): Date | null | undefined {
		return this.props.canceledAt;
	}

	isActive(): boolean {
		return this.props.status === 'ACTIVE' && new Date() <= this.props.currentPeriodEnd;
	}

	toJSON() {
		return {
			id: this.id,
			restaurantId: this.restaurantId,
			planId: this.planId,
			status: this.status,
			isActive: this.isActive(),
			currentPeriodStart: this.currentPeriodStart.toISOString(),
			currentPeriodEnd: this.currentPeriodEnd.toISOString(),
			canceledAt: this.canceledAt ? this.canceledAt.toISOString() : null,
		};
	}
}
