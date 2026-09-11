export interface SubscriptionActivatedEventPayload {
	eventId: string;
	subscriptionId: string;
	restaurantId: string;
	planCode: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	timestamp: string;
}

export interface ISubscriptionEventProducer {
	publishSubscriptionActivated(payload: SubscriptionActivatedEventPayload): Promise<void>;
	close(): Promise<void>;
}
