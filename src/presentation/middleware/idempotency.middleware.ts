import type { ICacheService } from '@application/ports/services/cache.service.port.ts';
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
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

export function idempotencyMiddleware(cacheService?: ICacheService) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const rawKey = getHeaderValue(req.headers[HTTP_HEADERS.IDEMPOTENCY_KEY]);
		const idempotencyKey = rawKey?.trim();

		if (!idempotencyKey) {
			throw new BadRequestError(MESSAGES.IDEMPOTENCY_KEY_REQUIRED);
		}

		const cache = cacheService ?? container.get<ICacheService>(TYPES.Services.CacheService);
		const cacheKey = `${REFUND_IDEMPOTENCY_KEY_PREFIX}${idempotencyKey}`;
		const lockKey = `${REFUND_LOCK_KEY_PREFIX}${idempotencyKey}`;

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
		const acquired = await cache.acquireLock(lockKey, REFUND_LOCK_TTL_SECONDS);
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
				cache.set(cacheKey, JSON.stringify(body), IDEMPOTENCY_TTL_SECONDS).catch(() => {});
			}
			return originalJson(body);
		};

		res.on('finish', releaseLockSafely);
		res.on('close', releaseLockSafely);

		next();
	};
}
