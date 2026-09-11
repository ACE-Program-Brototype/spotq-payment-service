export interface CreateSubscriptionOrderInput {
	restaurantId: string;
	planId: string;
	restaurantName?: string;
	restaurantEmail?: string;
	restaurantPhone?: string;
}

export interface CreateSubscriptionOrderOutput {
	orderId: string;
	amount: number;
	currency: string;
	keyId: string;
	plan: {
		id: string;
		name: string;
		code: string;
	};
	restaurant: {
		name?: string;
		email?: string;
		phone?: string;
	};
}
