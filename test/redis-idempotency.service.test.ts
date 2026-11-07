import { IdempotencyStorageUnavailableError } from '@domain/errors/payment.errors.ts';
import { RedisIdempotencyService } from '@infrastructure/redis/redis-idempotency.service.ts';

describe('RedisIdempotencyService (Live Redis Commands & Lua Token Guards)', () => {
	const createMockRedisClient = () => {
		const store = new Map<string, string>();
		return {
			isOpen: true,
			store,
			set: jest.fn(
				async (
					key: string,
					value: string,
					options?: { NX?: boolean; EX?: number },
				): Promise<string | null> => {
					if (options?.NX && store.has(key)) {
						return null;
					}
					store.set(key, value);
					return 'OK';
				},
			),
			get: jest.fn(async (key: string): Promise<string | null> => {
				return store.get(key) ?? null;
			}),
			eval: jest.fn(
				async (
					script: string,
					options: { keys: string[]; arguments: string[] },
				): Promise<number> => {
					const key = options.keys[0];
					const token = options.arguments[0];
					const current = store.get(key);
					if (!current) {
						return 0;
					}
					if (script.includes('string.find')) {
						if (current.includes(token)) {
							store.delete(key);
							return 1;
						}
						return 0;
					}
					if (current === token) {
						store.delete(key);
						return 1;
					}
					return 0;
				},
			),
		};
	};

	it('claims new key with NX+EX, marks IN_PROGRESS for concurrent caller, and replays COMPLETED response', async () => {
		const mockClient = createMockRedisClient();
		const service = new RedisIdempotencyService(mockClient as never);
		const scopeKey = 'idempotency:sub-renew:rest-1:sub-1:key-1';

		const firstClaim = await service.claimOrGet<{ orderId: string }>(scopeKey, 'hash-a', 60);
		expect(firstClaim.status).toBe('CLAIMED');
		expect(mockClient.set).toHaveBeenCalledWith(scopeKey, expect.any(String), {
			NX: true,
			EX: 60,
		});

		const concurrentClaim = await service.claimOrGet<{ orderId: string }>(scopeKey, 'hash-a', 60);
		expect(concurrentClaim).toEqual({ status: 'IN_PROGRESS' });

		const mismatchClaim = await service.claimOrGet<{ orderId: string }>(scopeKey, 'hash-b', 60);
		expect(mismatchClaim).toEqual({ status: 'PAYLOAD_MISMATCH' });

		await service.complete(scopeKey, 'hash-a', { orderId: 'order_cached_1' }, 86400);

		const replayClaim = await service.claimOrGet<{ orderId: string }>(scopeKey, 'hash-a', 60);
		expect(replayClaim).toEqual({
			status: 'REPLAY',
			response: { orderId: 'order_cached_1' },
		});
	});

	it('releases IN_PROGRESS claim only when claimToken matches and never deletes COMPLETED record', async () => {
		const mockClient = createMockRedisClient();
		const service = new RedisIdempotencyService(mockClient as never);
		const scopeKey = 'idempotency:sub-renew:rest-1:sub-1:key-2';

		const claim = await service.claimOrGet<{ orderId: string }>(scopeKey, 'hash-a', 60);
		if (claim.status !== 'CLAIMED') {
			throw new Error('Expected CLAIMED status');
		}

		await service.releaseClaim(scopeKey, 'wrong-token');
		expect(mockClient.store.has(scopeKey)).toBe(true);

		await service.releaseClaim(scopeKey, claim.claimToken);
		expect(mockClient.store.has(scopeKey)).toBe(false);

		const secondClaim = await service.claimOrGet<{ orderId: string }>(scopeKey, 'hash-a', 60);
		if (secondClaim.status !== 'CLAIMED') {
			throw new Error('Expected CLAIMED status on retry');
		}
		await service.complete(scopeKey, 'hash-a', { orderId: 'order_done' }, 86400);
		await service.releaseClaim(scopeKey, secondClaim.claimToken);
		expect(mockClient.store.has(scopeKey)).toBe(true);
	});

	it('acquires and releases subscription mutex safely using owner token comparison', async () => {
		const mockClient = createMockRedisClient();
		const service = new RedisIdempotencyService(mockClient as never);

		const tokenA = await service.acquireSubscriptionLock('sub-100', 15);
		expect(tokenA).toBeTruthy();

		const tokenB = await service.acquireSubscriptionLock('sub-100', 15);
		expect(tokenB).toBeNull();

		await service.releaseSubscriptionLock('sub-100', 'stale-other-token');
		expect(await service.acquireSubscriptionLock('sub-100', 15)).toBeNull();

		await service.releaseSubscriptionLock('sub-100', tokenA as string);
		const tokenC = await service.acquireSubscriptionLock('sub-100', 15);
		expect(tokenC).toBeTruthy();
	});

	it('handles malformed corrupted JSON gracefully without crashing', async () => {
		const mockClient = createMockRedisClient();
		const service = new RedisIdempotencyService(mockClient as never);
		const scopeKey = 'idempotency:corrupted:1';

		mockClient.store.set(scopeKey, '{not-valid-json');

		const claim = await service.claimOrGet(scopeKey, 'any-hash', 60);
		expect(claim.status).toBe('IN_PROGRESS');
	});

	it('fails closed and throws IdempotencyStorageUnavailableError when Redis client is not open', async () => {
		const mockClient = { ...createMockRedisClient(), isOpen: false };
		const service = new RedisIdempotencyService(mockClient as never);
		const scopeKey = 'idempotency:sub-renew:rest-1:sub-1:key-closed';

		await expect(service.claimOrGet(scopeKey, 'hash-a', 60)).rejects.toThrow(
			IdempotencyStorageUnavailableError,
		);
		await expect(service.acquireSubscriptionLock('sub-1', 15)).rejects.toThrow(
			IdempotencyStorageUnavailableError,
		);
		await expect(service.complete(scopeKey, 'hash-a', { orderId: 'ord-1' }, 60)).rejects.toThrow(
			IdempotencyStorageUnavailableError,
		);
	});

	it('fails closed and throws IdempotencyStorageUnavailableError when Redis commands throw error', async () => {
		const mockClient = {
			...createMockRedisClient(),
			set: jest.fn().mockRejectedValue(new Error('Connection dropped')),
		};
		const service = new RedisIdempotencyService(mockClient as never);
		const scopeKey = 'idempotency:sub-renew:rest-1:sub-1:key-err';

		await expect(service.claimOrGet(scopeKey, 'hash-a', 60)).rejects.toThrow(
			IdempotencyStorageUnavailableError,
		);
		await expect(service.acquireSubscriptionLock('sub-1', 15)).rejects.toThrow(
			IdempotencyStorageUnavailableError,
		);
		await expect(service.complete(scopeKey, 'hash-a', { orderId: 'ord-1' }, 60)).rejects.toThrow(
			IdempotencyStorageUnavailableError,
		);
	});
});
