import { IDEMPOTENCY_CLAIM_STATUS, type IdempotencyClaimStatus } from '@shared/constants/index.ts';

export { IDEMPOTENCY_CLAIM_STATUS, type IdempotencyClaimStatus };

export type IdempotencyClaimResult<T> =
	| {
			status: typeof IDEMPOTENCY_CLAIM_STATUS.CLAIMED;
			claimToken: string;
	  }
	| {
			status: typeof IDEMPOTENCY_CLAIM_STATUS.REPLAY;
			response: T;
	  }
	| {
			status: typeof IDEMPOTENCY_CLAIM_STATUS.IN_PROGRESS;
	  }
	| {
			status: typeof IDEMPOTENCY_CLAIM_STATUS.PAYLOAD_MISMATCH;
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
