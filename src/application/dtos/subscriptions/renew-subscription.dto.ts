export interface RenewSubscriptionInputDTO {
	subscriptionId: string;
	restaurantId: string;
	idempotencyKey: string;
	planId?: string;
	restaurantName?: string;
	restaurantEmail?: string;
	restaurantPhone?: string;
}

export interface RenewSubscriptionPlanDTO {
	id: string;
	name: string;
	code: string;
}

export interface RenewSubscriptionDetailsDTO {
	id: string;
	currentStatus: string;
	currentPeriodEnd: string;
	renewalWindowDays: number;
	isRenewal: boolean;
}

export interface RenewSubscriptionRestaurantDTO {
	name?: string;
	email?: string;
	phone?: string;
}

export interface RenewSubscriptionOutputDTO {
	orderId: string;
	amount: number;
	currency: string;
	keyId: string;
	plan: RenewSubscriptionPlanDTO;
	subscription: RenewSubscriptionDetailsDTO;
	restaurant: RenewSubscriptionRestaurantDTO;
	replayed?: boolean;
}
