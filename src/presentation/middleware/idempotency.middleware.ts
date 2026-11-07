import { createHash } from 'node:crypto';
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

		const canonicalize = (value: unknown): string => {
			if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
			if (value && typeof value === 'object') {
				return `{${Object.entries(value)
					.sort(([left], [right]) => left.localeCompare(right))
					.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
					.join(',')}}`;
			}
			return JSON.stringify(value) ?? 'undefined';
		};

		// A key reused for a different operation must conflict instead of replaying the wrong response.
		const fingerprint = createHash('sha256')
			.update(`${req.method}:${req.originalUrl}:${canonicalize(req.body)}`)
			.digest('hex');

		// 1. Check if response is already cached (Tape-recorder replay)
		// Replay a completed response before attempting to acquire the request lock.
		const cached = await cache.get(cacheKey);
		if (cached) {
			try {
				const parsed = JSON.parse(cached) as {
					fingerprint: string;
					statusCode: number;
					body: unknown;
				};
				if (parsed.fingerprint !== fingerprint) throw new ConflictError(MESSAGES.CONFLICT);
				res.status(parsed.statusCode).json(parsed.body);
				return;
			} catch (error) {
				if (error instanceof ConflictError) throw error;
				// Continue processing if parsing fails
			}
		}

		// 2. Try acquiring distributed lock to prevent concurrent executions
		// Only one in-flight request for this idempotency key may proceed.
		const acquired = await cache.acquireLock(lockKey, lockTtl);
		if (!acquired) {
			throw new ConflictError(MESSAGES.CONFLICT);
		}

		// Cache successful responses with their fingerprint and status before sending them.
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
				void cache
					.set(
						cacheKey,
						JSON.stringify({ fingerprint, statusCode: res.statusCode, body }),
						ttl,
					)
					.then(() => originalJson(body))
					.catch(() => originalJson(body));
				return res;
			}
			return originalJson(body);
		};

		res.on('finish', releaseLockSafely);
		res.on('close', releaseLockSafely);

		return next();
	};
}
