export interface IPaymentSubscriptionExpiryService {
	start(intervalMs?: number): void;
	stop(): void;
	expirePastDueSubscriptions(now?: Date): Promise<number>;
}
