import type { Subscription } from '@domain/entities/subscription.entity.ts';
import type {
	PaginatedSubscribersResult,
	SubscriberDetail,
	SubscriberFilterParams,
} from '@domain/types/subscriber-query.types.ts';
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

export interface ActivateSubscriptionOutboxPayload {
	restaurantId: string;
	planCode: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	timestamp: string;
	subscriptionId?: string;
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
		payload: ActivateSubscriptionOutboxPayload;
	};
}

export interface RenewSubscriptionInput {
	subscriptionId: string;
	restaurantId: string;
	planId: string;
	status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
}

export interface RenewSubscriptionWithOutboxParams {
	subscription: RenewSubscriptionInput;
	payment: {
		razorpayOrderId: string;
		razorpayPaymentId: string;
		razorpaySignature: string;
	};
	outbox: {
		eventType: string;
		aggregateId: string;
		payload: ActivateSubscriptionOutboxPayload;
	};
}

export interface ISubscriptionRepository
	extends IBaseRepository<Subscription, CreateSubscriptionInput, UpdateSubscriptionInput> {
	findActiveByRestaurantId(restaurantId: string): Promise<Subscription | null>;
	create(data: CreateSubscriptionInput): Promise<Subscription>;
	activateSubscriptionWithOutbox(
		params: ActivateSubscriptionWithOutboxParams,
	): Promise<Subscription>;
	renewSubscriptionWithOutbox(params: RenewSubscriptionWithOutboxParams): Promise<Subscription>;
	findSubscribersPaginated(params: SubscriberFilterParams): Promise<PaginatedSubscribersResult>;
	findSubscriberDetailById(subscriberId: string): Promise<SubscriberDetail | null>;
}
