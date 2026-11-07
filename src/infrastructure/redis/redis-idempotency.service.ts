import crypto from 'node:crypto';
import type {
	IdempotencyClaimResult,
	IIdempotencyService,
} from '@application/ports/services/idempotency.service.port.ts';
import { DomainError, IdempotencyStorageUnavailableError } from '@domain/errors/payment.errors.ts';
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

	constructor(@unmanaged() client?: RedisClientType) {
		this.client = client ?? redisClient;
	}

	async claimOrGet<T>(
		scopeKey: string,
		payloadHash: string,
		inProgressTtlSeconds: number,
	): Promise<IdempotencyClaimResult<T>> {
		if (!this.client.isOpen) {
			logger.error({ scopeKey }, 'Redis client is not open; rejecting idempotency claim');
			throw new IdempotencyStorageUnavailableError();
		}

		const claimToken = crypto.randomUUID();
		const inProgressPayload: StoredIdempotencyRecord<T> = {
			state: 'IN_PROGRESS',
			payloadHash,
			claimToken,
		};
		const serializedClaim = JSON.stringify(inProgressPayload);

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
			if (error instanceof DomainError) {
				throw error;
			}
			logger.error({ err: error, scopeKey }, 'Redis idempotency claim failed due to storage error');
			throw new IdempotencyStorageUnavailableError();
		}
	}

	async complete<T>(
		scopeKey: string,
		payloadHash: string,
		response: T,
		completedTtlSeconds: number,
	): Promise<void> {
		if (!this.client.isOpen) {
			logger.error({ scopeKey }, 'Redis client is not open; unable to complete idempotency record');
			throw new IdempotencyStorageUnavailableError();
		}

		const completedRecord: StoredIdempotencyRecord<T> = {
			state: 'COMPLETED',
			payloadHash,
			response,
		};
		const serialized = JSON.stringify(completedRecord);

		try {
			await this.client.set(scopeKey, serialized, {
				EX: completedTtlSeconds,
			});
		} catch (error) {
			logger.error(
				{ err: error, scopeKey },
				'Redis idempotency completion write failed due to storage error',
			);
			throw new IdempotencyStorageUnavailableError();
		}
	}

	async releaseClaim(scopeKey: string, claimToken: string): Promise<void> {
		if (!this.client.isOpen) {
			logger.warn({ scopeKey }, 'Redis client is not open; skipping releaseClaim');
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
		if (!this.client.isOpen) {
			logger.error(
				{ subscriptionId },
				'Redis client is not open; rejecting subscription lock acquisition',
			);
			throw new IdempotencyStorageUnavailableError();
		}

		const lockKey = `${IDEMPOTENCY_REDIS_PREFIXES.SUBSCRIPTION_LOCK}:${subscriptionId}`;
		const lockToken = crypto.randomUUID();

		try {
			const result = await this.client.set(lockKey, lockToken, {
				NX: true,
				EX: ttlSeconds,
			});
			return result === 'OK' ? lockToken : null;
		} catch (error) {
			if (error instanceof DomainError) {
				throw error;
			}
			logger.error(
				{ err: error, subscriptionId },
				'Redis subscription lock acquisition failed due to storage error',
			);
			throw new IdempotencyStorageUnavailableError();
		}
	}

	async releaseSubscriptionLock(subscriptionId: string, lockToken: string): Promise<void> {
		if (!this.client.isOpen) {
			logger.warn({ subscriptionId }, 'Redis client is not open; skipping releaseSubscriptionLock');
			return;
		}

		const lockKey = `${IDEMPOTENCY_REDIS_PREFIXES.SUBSCRIPTION_LOCK}:${subscriptionId}`;
		try {
			await this.client.eval(RELEASE_LOCK_LUA, {
				keys: [lockKey],
				arguments: [lockToken],
			});
		} catch (error) {
			logger.warn({ err: error, subscriptionId }, 'Failed to release Redis subscription lock');
		}
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
}
