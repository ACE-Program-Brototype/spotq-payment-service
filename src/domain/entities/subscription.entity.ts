import type { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import {
	ForbiddenSubscriptionAccessError,
	SubscriptionNotEligibleForRenewalError,
} from '@domain/errors/payment.errors.ts';
import {
	MILLISECONDS_PER_DAY,
	SUBSCRIPTION_RENEWAL_WINDOW_DAYS,
	SUBSCRIPTION_STATUS,
	type SubscriptionStatus,
} from '@shared/constants/index.ts';

export type { SubscriptionStatus };

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

export interface SubscriptionPeriodRange {
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
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

	get createdAt(): Date | undefined {
		return this.props.createdAt;
	}

	get updatedAt(): Date | undefined {
		return this.props.updatedAt;
	}

	isOwnedByRestaurant(restaurantId: string): boolean {
		return Boolean(restaurantId) && this.props.restaurantId === restaurantId;
	}

	assertOwnedByRestaurant(restaurantId: string): void {
		if (!this.isOwnedByRestaurant(restaurantId)) {
			throw new ForbiddenSubscriptionAccessError();
		}
	}

	isActive(now: Date = new Date()): boolean {
		return this.props.status === SUBSCRIPTION_STATUS.ACTIVE && now <= this.props.currentPeriodEnd;
	}

	isExpired(now: Date = new Date()): boolean {
		return (
			this.props.status === SUBSCRIPTION_STATUS.EXPIRED ||
			this.props.status === SUBSCRIPTION_STATUS.PAST_DUE ||
			now > this.props.currentPeriodEnd
		);
	}

	isEligibleForRenewal(
		now: Date = new Date(),
		windowDays: number = SUBSCRIPTION_RENEWAL_WINDOW_DAYS,
	): boolean {
		if (
			this.props.status === SUBSCRIPTION_STATUS.CANCELLED ||
			this.props.status === SUBSCRIPTION_STATUS.PENDING
		) {
			return false;
		}

		if (this.isExpired(now)) {
			return true;
		}

		if (this.props.status === SUBSCRIPTION_STATUS.ACTIVE) {
			const windowMs = windowDays * MILLISECONDS_PER_DAY;
			const timeRemainingMs = this.props.currentPeriodEnd.getTime() - now.getTime();
			return timeRemainingMs <= windowMs;
		}

		return false;
	}

	assertEligibleForRenewal(
		now: Date = new Date(),
		windowDays: number = SUBSCRIPTION_RENEWAL_WINDOW_DAYS,
	): void {
		if (!this.isEligibleForRenewal(now, windowDays)) {
			throw new SubscriptionNotEligibleForRenewalError();
		}
	}

	calculateRenewalPeriod(plan: SubscriptionPlan, now: Date = new Date()): SubscriptionPeriodRange {
		if (this.isExpired(now)) {
			return {
				currentPeriodStart: now,
				currentPeriodEnd: plan.calculatePeriodEnd(now),
			};
		}

		return {
			currentPeriodStart: this.props.currentPeriodStart,
			currentPeriodEnd: plan.calculatePeriodEnd(this.props.currentPeriodEnd),
		};
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
