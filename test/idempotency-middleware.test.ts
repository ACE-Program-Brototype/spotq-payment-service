import type { ICacheService } from '@application/ports/services/cache.service.port.ts';
import { idempotencyMiddleware } from '@presentation/middleware/idempotency.middleware.ts';
import { HTTP_STATUS } from '@shared/constants/index.ts';
import { BadRequestError, ConflictError } from '@shared/errors/index.ts';
import type { NextFunction, Request, Response } from 'express';

describe('Idempotency Middleware', () => {
	let mockCacheService: jest.Mocked<ICacheService>;
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let nextFn: NextFunction;
	let finishCallbacks: (() => void)[];

	beforeEach(() => {
		finishCallbacks = [];

		mockCacheService = {
			get: jest.fn().mockResolvedValue(null),
			set: jest.fn().mockResolvedValue(undefined),
			acquireLock: jest.fn().mockResolvedValue(true),
			releaseLock: jest.fn().mockResolvedValue(undefined),
		};

		mockReq = {
			headers: {},
		};

		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			statusCode: 200,
			on: jest.fn().mockImplementation((event, callback) => {
				if (event === 'finish' || event === 'close') {
					finishCallbacks.push(callback);
				}
				return mockRes as Response;
			}),
		};

		nextFn = jest.fn();
	});

	it('should throw BadRequestError when idempotency key is missing or empty', async () => {
		mockReq.headers = {};
		const middleware = idempotencyMiddleware(mockCacheService);

		await expect(middleware(mockReq as Request, mockRes as Response, nextFn)).rejects.toThrow(
			BadRequestError,
		);
		expect(mockCacheService.acquireLock).not.toHaveBeenCalled();
		expect(nextFn).not.toHaveBeenCalled();
	});

	it('should handle array header values using getHeaderValue', async () => {
		mockReq.headers = { 'x-idempotency-key': ['test-key-arr'] as unknown as string };
		const middleware = idempotencyMiddleware(mockCacheService);
		await middleware(mockReq as Request, mockRes as Response, nextFn);

		expect(mockCacheService.acquireLock).toHaveBeenCalledWith('lock:refund:test-key-arr', 15);
		expect(nextFn).toHaveBeenCalledTimes(1);
	});

	it('should return cached response on cache hit without acquiring lock', async () => {
		const cachedData = {
			refundId: 'rfnd_123',
			status: 'PROCESSED',
		};
		mockCacheService.get.mockResolvedValue(JSON.stringify(cachedData));
		mockReq.headers = { 'x-idempotency-key': 'test-key-1' };

		const middleware = idempotencyMiddleware(mockCacheService);
		await middleware(mockReq as Request, mockRes as Response, nextFn);

		expect(mockCacheService.get).toHaveBeenCalledWith('idempotency:refund:test-key-1');
		expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
		expect(mockRes.json).toHaveBeenCalledWith(cachedData);
		expect(mockCacheService.acquireLock).not.toHaveBeenCalled();
		expect(nextFn).not.toHaveBeenCalled();
	});

	it('should throw ConflictError if distributed lock cannot be acquired (concurrent request)', async () => {
		mockCacheService.get.mockResolvedValue(null);
		mockCacheService.acquireLock.mockResolvedValue(false);
		mockReq.headers = { 'x-idempotency-key': 'test-key-concurrent' };

		const middleware = idempotencyMiddleware(mockCacheService);

		await expect(middleware(mockReq as Request, mockRes as Response, nextFn)).rejects.toThrow(
			ConflictError,
		);
		expect(mockCacheService.acquireLock).toHaveBeenCalledWith(
			'lock:refund:test-key-concurrent',
			15,
		);
		expect(nextFn).not.toHaveBeenCalled();
	});

	it('should acquire lock, call next(), cache 200 response on finish, and release lock', async () => {
		mockCacheService.get.mockResolvedValue(null);
		mockCacheService.acquireLock.mockResolvedValue(true);
		mockReq.headers = { 'x-idempotency-key': 'test-key-new' };

		const middleware = idempotencyMiddleware(mockCacheService);
		await middleware(mockReq as Request, mockRes as Response, nextFn);

		expect(mockCacheService.acquireLock).toHaveBeenCalledWith('lock:refund:test-key-new', 15);
		expect(nextFn).toHaveBeenCalledTimes(1);

		// Downstream controller returns response
		const responseBody = { refundId: 'rfnd_new_123', status: 'PROCESSED' };
		mockRes.json?.(responseBody);

		expect(mockCacheService.set).toHaveBeenCalledWith(
			'idempotency:refund:test-key-new',
			JSON.stringify(responseBody),
			86400,
		);

		// Trigger response finish
		for (const cb of finishCallbacks) {
			cb();
		}

		expect(mockCacheService.releaseLock).toHaveBeenCalledWith('lock:refund:test-key-new');
	});

	it('should release lock on finish even if response is non-2xx without caching', async () => {
		mockCacheService.get.mockResolvedValue(null);
		mockCacheService.acquireLock.mockResolvedValue(true);
		mockReq.headers = { 'x-idempotency-key': 'test-key-error' };

		const middleware = idempotencyMiddleware(mockCacheService);
		await middleware(mockReq as Request, mockRes as Response, nextFn);

		expect(nextFn).toHaveBeenCalledTimes(1);

		// Controller returned 400 error
		mockRes.statusCode = 400;
		mockRes.json?.({ error: 'BAD_REQUEST' });

		expect(mockCacheService.set).not.toHaveBeenCalled();

		// Trigger response finish
		for (const cb of finishCallbacks) {
			cb();
		}

		expect(mockCacheService.releaseLock).toHaveBeenCalledWith('lock:refund:test-key-error');
	});

	it('should support custom key prefixes and lock TTL via options object', async () => {
		mockCacheService.get.mockResolvedValue(null);
		mockCacheService.acquireLock.mockResolvedValue(true);
		mockReq.headers = { 'x-idempotency-key': 'order-123' };

		const middleware = idempotencyMiddleware({
			cacheService: mockCacheService,
			prefix: 'idemp:order:',
			lockPrefix: 'lock:order:',
			lockTtlSeconds: 30,
		});

		await middleware(mockReq as Request, mockRes as Response, nextFn);

		expect(mockCacheService.get).toHaveBeenCalledWith('idemp:order:order-123');
		expect(mockCacheService.acquireLock).toHaveBeenCalledWith('lock:order:order-123', 30);
		expect(nextFn).toHaveBeenCalledTimes(1);
	});

	it('should throw Error when CacheService is not provided', async () => {
		mockReq.headers = { 'x-idempotency-key': 'any-key' };
		const middleware = idempotencyMiddleware({});

		await expect(middleware(mockReq as Request, mockRes as Response, nextFn)).rejects.toThrow(
			'CacheService must be configured for idempotencyMiddleware',
		);
	});
});
