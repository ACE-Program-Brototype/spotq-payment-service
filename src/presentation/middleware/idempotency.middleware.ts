import type { ICacheService } from '@application/ports/services/cache.service.port.ts';
import { getHeaderValue } from '@presentation/middleware/customer-auth.middleware.ts';
import {
	HTTP_HEADERS,
	HTTP_STATUS,
	IDEMPOTENCY_TTL_SECONDS,
	MESSAGES,
	REFUND_IDEMPOTENCY_KEY_PREFIX,
	REFUND_LOCK_KEY_PREFIX,
	REFUND_LOCK_TTL_SECONDS,
} from '@shared/constants/index.ts';
import { BadRequestError, ConflictError } from '@shared/errors/index.ts';
import type { NextFunction, Request, Response } from 'express';

export interface IdempotencyMiddlewareOptions {
	prefix?: string;
	lockPrefix?: string;
	ttlSeconds?: number;
	lockTtlSeconds?: number;
	cacheService?: ICacheService;
}

export function idempotencyMiddleware(
	optionsOrCacheService?: IdempotencyMiddlewareOptions | ICacheService,
) {
	const options: IdempotencyMiddlewareOptions =
		optionsOrCacheService && 'get' in optionsOrCacheService
			? { cacheService: optionsOrCacheService as ICacheService }
			: ((optionsOrCacheService as IdempotencyMiddlewareOptions) ?? {});

	const cache = options.cacheService;
	const keyPrefix = options.prefix ?? REFUND_IDEMPOTENCY_KEY_PREFIX;
	const lockPrefix = options.lockPrefix ?? REFUND_LOCK_KEY_PREFIX;
	const ttl = options.ttlSeconds ?? IDEMPOTENCY_TTL_SECONDS;
	const lockTtl = options.lockTtlSeconds ?? REFUND_LOCK_TTL_SECONDS;

	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const rawKey = getHeaderValue(req.headers[HTTP_HEADERS.IDEMPOTENCY_KEY]);
		const idempotencyKey = rawKey?.trim();

		if (!idempotencyKey) {
			throw new BadRequestError(MESSAGES.IDEMPOTENCY_KEY_REQUIRED);
		}

		if (!cache) {
			throw new Error('CacheService must be configured for idempotencyMiddleware');
		}

		const cacheKey = `${keyPrefix}${idempotencyKey}`;
		const lockKey = `${lockPrefix}${idempotencyKey}`;

		// 1. Check if response is already cached (Tape-recorder replay)
		const cached = await cache.get(cacheKey);
		if (cached) {
			try {
				const parsed = JSON.parse(cached);
				res.status(HTTP_STATUS.OK).json(parsed);
				return;
			} catch {
				// Continue processing if parsing fails
			}
		}

		// 2. Try acquiring distributed lock to prevent concurrent executions
		const acquired = await cache.acquireLock(lockKey, lockTtl);
		if (!acquired) {
			throw new ConflictError(MESSAGES.CONFLICT);
		}

		// 3. Hook into response to cache successful (2xx) responses and release the lock
		const originalJson = res.json.bind(res);
		let lockReleased = false;

		const releaseLockSafely = async () => {
			if (!lockReleased) {
				lockReleased = true;
				await cache.releaseLock(lockKey).catch(() => {});
			}
		};

		res.json = (body: unknown): Response => {
			if (res.statusCode >= HTTP_STATUS.OK && res.statusCode < HTTP_STATUS.BAD_REQUEST) {
				cache.set(cacheKey, JSON.stringify(body), ttl).catch(() => {});
			}
			return originalJson(body);
		};

		res.on('finish', releaseLockSafely);
		res.on('close', releaseLockSafely);
		
		next();
	};
}
