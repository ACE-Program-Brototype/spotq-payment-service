export interface SubscriptionStatusOutput {
	isSubscriptionActive: boolean;
	subscription: {
		id: string;
		status: string;
		planCode?: string;
		planName?: string;
		currentPeriodStart?: string;
		currentPeriodEnd?: string;
	} | null;
}
