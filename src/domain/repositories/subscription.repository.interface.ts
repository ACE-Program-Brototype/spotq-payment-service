import type { Subscription } from '../entities/subscription.entity.ts';
import type { IBaseRepository } from './base.repository.interface.ts';

export interface CreateSubscriptionInput {
	restaurantId: string;
	planId: string;
	status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
}

export interface UpdateSubscriptionInput {
	status?: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
	currentPeriodStart?: Date;
	currentPeriodEnd?: Date;
	canceledAt?: Date | null;
}

export interface ActivateSubscriptionWithOutboxParams {
	subscription: CreateSubscriptionInput;
	payment: {
		razorpayOrderId: string;
		razorpayPaymentId: string;
		razorpaySignature: string;
	};
	outbox: {
		eventType: string;
		aggregateId: string;
		payload: Record<string, unknown>;
	};
}

export interface ISubscriptionRepository
	extends IBaseRepository<Subscription, CreateSubscriptionInput, UpdateSubscriptionInput> {
	findActiveByRestaurantId(restaurantId: string): Promise<Subscription | null>;
	create(data: CreateSubscriptionInput): Promise<Subscription>;
	activateSubscriptionWithOutbox(
		params: ActivateSubscriptionWithOutboxParams,
	): Promise<Subscription>;
}
