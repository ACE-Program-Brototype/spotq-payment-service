import type { Subscription } from '../entities/subscription.entity.ts';

export interface CreateSubscriptionInput {
	restaurantId: string;
	planId: string;
	status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
}

export interface ISubscriptionRepository {
	findActiveByRestaurantId(restaurantId: string): Promise<Subscription | null>;
	findById(id: string): Promise<Subscription | null>;
	create(data: CreateSubscriptionInput): Promise<Subscription>;
}
