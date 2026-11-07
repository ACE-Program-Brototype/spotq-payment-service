import crypto from 'node:crypto';
import type {
	IdempotencyClaimResult,
	IIdempotencyService,
} from '@application/ports/services/idempotency.service.port.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	IDEMPOTENCY_CLAIM_STATUS,
	IDEMPOTENCY_REDIS_PREFIXES,
} from '@shared/constants/subscription.constants.ts';
import { injectable, unmanaged } from 'inversify';
import type { RedisClientType } from 'redis';
import { redisClient } from './redis.client.ts';

interface StoredIdempotencyRecord<T = unknown> {
	state: 'IN_PROGRESS' | 'COMPLETED';
	payloadHash: string;
	claimToken?: string;
	response?: T;
}

interface FallbackEntry {
	rawValue: string;
	expiresAt: number;
}

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
	return redis.call("del", KEYS[1])
else
	return 0
end
`;

const RELEASE_CLAIM_LUA = `
local current = redis.call("get", KEYS[1])
if current and string.find(current, ARGV[1], 1, true) then
	return redis.call("del", KEYS[1])
else
	return 0
end
`;

@injectable()
export class RedisIdempotencyService implements IIdempotencyService {
	private readonly client: RedisClientType;
	private readonly fallbackRecords = new Map<string, FallbackEntry>();
	private readonly fallbackLocks = new Map<string, FallbackEntry>();

	constructor(@unmanaged() client?: RedisClientType) {
		this.client = client ?? redisClient;
	}

	async claimOrGet<T>(
		scopeKey: string,
		payloadHash: string,
		inProgressTtlSeconds: number,
	): Promise<IdempotencyClaimResult<T>> {
		const claimToken = crypto.randomUUID();
		const inProgressPayload: StoredIdempotencyRecord<T> = {
			state: 'IN_PROGRESS',
			payloadHash,
			claimToken,
		};
		const serializedClaim = JSON.stringify(inProgressPayload);

		if (!this.client.isOpen) {
			return this.claimOrGetInMemory<T>(
				scopeKey,
				payloadHash,
				claimToken,
				serializedClaim,
				inProgressTtlSeconds,
			);
		}

		try {
			const setResult = await this.client.set(scopeKey, serializedClaim, {
				NX: true,
				EX: inProgressTtlSeconds,
			});

			if (setResult === 'OK') {
				return { status: IDEMPOTENCY_CLAIM_STATUS.CLAIMED, claimToken };
			}

			const existingRaw = await this.client.get(scopeKey);
			if (!existingRaw) {
				const retrySet = await this.client.set(scopeKey, serializedClaim, {
					NX: true,
					EX: inProgressTtlSeconds,
				});
				if (retrySet === 'OK') {
					return { status: IDEMPOTENCY_CLAIM_STATUS.CLAIMED, claimToken };
				}
				return { status: IDEMPOTENCY_CLAIM_STATUS.IN_PROGRESS };
			}

			return this.evaluateExistingRecord<T>(existingRaw, payloadHash);
		} catch (error) {
			logger.warn(
				{ err: error, scopeKey },
				'Redis idempotency claim failed; falling back to in-memory store',
			);
			return this.claimOrGetInMemory<T>(
				scopeKey,
				payloadHash,
				claimToken,
				serializedClaim,
				inProgressTtlSeconds,
			);
		}
	}

	async complete<T>(
		scopeKey: string,
		payloadHash: string,
		response: T,
		completedTtlSeconds: number,
	): Promise<void> {
		const completedRecord: StoredIdempotencyRecord<T> = {
			state: 'COMPLETED',
			payloadHash,
			response,
		};
		const serialized = JSON.stringify(completedRecord);

		if (!this.client.isOpen) {
			this.fallbackRecords.set(scopeKey, {
				rawValue: serialized,
				expiresAt: Date.now() + completedTtlSeconds * 1000,
			});
			return;
		}

		try {
			await this.client.set(scopeKey, serialized, {
				EX: completedTtlSeconds,
			});
		} catch (error) {
			logger.warn(
				{ err: error, scopeKey },
				'Redis idempotency completion write failed; caching in fallback store',
			);
			this.fallbackRecords.set(scopeKey, {
				rawValue: serialized,
				expiresAt: Date.now() + completedTtlSeconds * 1000,
			});
		}
	}

	async releaseClaim(scopeKey: string, claimToken: string): Promise<void> {
		const fallbackEntry = this.fallbackRecords.get(scopeKey);
		if (fallbackEntry?.rawValue.includes(claimToken)) {
			this.fallbackRecords.delete(scopeKey);
		}

		if (!this.client.isOpen) {
			return;
		}

		try {
			await this.client.eval(RELEASE_CLAIM_LUA, {
				keys: [scopeKey],
				arguments: [claimToken],
			});
		} catch (error) {
			logger.warn({ err: error, scopeKey }, 'Failed to release Redis idempotency claim');
		}
	}

	async acquireSubscriptionLock(
		subscriptionId: string,
		ttlSeconds: number,
	): Promise<string | null> {
		const lockKey = `${IDEMPOTENCY_REDIS_PREFIXES.SUBSCRIPTION_LOCK}:${subscriptionId}`;
		const lockToken = crypto.randomUUID();

		if (!this.client.isOpen) {
			return this.acquireLockInMemory(lockKey, lockToken, ttlSeconds);
		}

		try {
			const result = await this.client.set(lockKey, lockToken, {
				NX: true,
				EX: ttlSeconds,
			});
			return result === 'OK' ? lockToken : null;
		} catch (error) {
			logger.warn(
				{ err: error, subscriptionId },
				'Redis subscription lock acquisition failed; falling back to in-memory lock',
			);
			return this.acquireLockInMemory(lockKey, lockToken, ttlSeconds);
		}
	}

	async releaseSubscriptionLock(subscriptionId: string, lockToken: string): Promise<void> {
		const lockKey = `${IDEMPOTENCY_REDIS_PREFIXES.SUBSCRIPTION_LOCK}:${subscriptionId}`;
		const fallbackLock = this.fallbackLocks.get(lockKey);
		if (fallbackLock?.rawValue === lockToken) {
			this.fallbackLocks.delete(lockKey);
		}

		if (!this.client.isOpen) {
			return;
		}

		try {
			await this.client.eval(RELEASE_LOCK_LUA, {
				keys: [lockKey],
				arguments: [lockToken],
			});
		} catch (error) {
			logger.warn({ err: error, subscriptionId }, 'Failed to release Redis subscription lock');
		}
	}

	clearFallbackState(): void {
		this.fallbackRecords.clear();
		this.fallbackLocks.clear();
	}

	private evaluateExistingRecord<T>(
		existingRaw: string,
		payloadHash: string,
	): IdempotencyClaimResult<T> {
		try {
			const parsed = JSON.parse(existingRaw) as StoredIdempotencyRecord<T>;
			if (parsed.payloadHash !== payloadHash) {
				return { status: IDEMPOTENCY_CLAIM_STATUS.PAYLOAD_MISMATCH };
			}
			if (parsed.state === 'COMPLETED' && parsed.response !== undefined) {
				return { status: IDEMPOTENCY_CLAIM_STATUS.REPLAY, response: parsed.response };
			}
			return { status: IDEMPOTENCY_CLAIM_STATUS.IN_PROGRESS };
		} catch (error) {
			logger.warn(
				{ err: error, rawSnippet: existingRaw.slice(0, 100) },
				'Failed to parse stored idempotency record; treating as IN_PROGRESS',
			);
			return { status: IDEMPOTENCY_CLAIM_STATUS.IN_PROGRESS };
		}
	}

	private claimOrGetInMemory<T>(
		scopeKey: string,
		payloadHash: string,
		claimToken: string,
		serializedClaim: string,
		ttlSeconds: number,
	): IdempotencyClaimResult<T> {
		const now = Date.now();
		const existing = this.fallbackRecords.get(scopeKey);

		if (existing && existing.expiresAt > now) {
			return this.evaluateExistingRecord<T>(existing.rawValue, payloadHash);
		}

		this.fallbackRecords.set(scopeKey, {
			rawValue: serializedClaim,
			expiresAt: now + ttlSeconds * 1000,
		});
		return { status: IDEMPOTENCY_CLAIM_STATUS.CLAIMED, claimToken };
	}

	private acquireLockInMemory(
		lockKey: string,
		lockToken: string,
		ttlSeconds: number,
	): string | null {
		const now = Date.now();
		const existing = this.fallbackLocks.get(lockKey);

		if (existing && existing.expiresAt > now) {
			return null;
		}

		this.fallbackLocks.set(lockKey, {
			rawValue: lockToken,
			expiresAt: now + ttlSeconds * 1000,
		});
		return lockToken;
	}
}
