export type IdempotencyClaimResult<T> =
	| {
			status: 'CLAIMED';
			claimToken: string;
	  }
	| {
			status: 'REPLAY';
			response: T;
	  }
	| {
			status: 'IN_PROGRESS';
	  }
	| {
			status: 'PAYLOAD_MISMATCH';
	  };

export interface IIdempotencyService {
	claimOrGet<T>(
		scopeKey: string,
		payloadHash: string,
		inProgressTtlSeconds: number,
	): Promise<IdempotencyClaimResult<T>>;

	complete<T>(
		scopeKey: string,
		payloadHash: string,
		response: T,
		completedTtlSeconds: number,
	): Promise<void>;

	releaseClaim(scopeKey: string, claimToken: string): Promise<void>;

	acquireSubscriptionLock(subscriptionId: string, ttlSeconds: number): Promise<string | null>;

	releaseSubscriptionLock(subscriptionId: string, lockToken: string): Promise<void>;
}
