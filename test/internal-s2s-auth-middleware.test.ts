import { env } from '@config/env.ts';
import {
	internalS2SAuthMiddleware,
	requireCallerService,
} from '@presentation/middleware/internal-s2s-auth.middleware.ts';
import { S2S_CALLER_SERVICES } from '@shared/constants/auth.constants.ts';
import { generateToken } from '@spotq-org/s2s-core';
import type { NextFunction, Request, Response } from 'express';

describe('internalS2SAuthMiddleware', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: jest.MockedFunction<NextFunction>;

	beforeEach(() => {
		mockReq = {
			headers: {},
			params: {},
		};
		mockRes = {
			status: jest.fn().mockReturnThis() as never,
			json: jest.fn().mockReturnThis() as never,
		};
		mockNext = jest.fn() as unknown as jest.MockedFunction<NextFunction>;
	});

	it('should return 401 when Authorization header is missing', () => {
		const middleware = internalS2SAuthMiddleware();
		middleware(mockReq as Request, mockRes as Response, mockNext);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockNext).not.toHaveBeenCalled();
	});

	it('should return 401 when token is invalid or malformed', () => {
		mockReq.headers = {
			authorization: 'Bearer invalid.token.value',
			'x-caller-service': S2S_CALLER_SERVICES.ORDER_SERVICE,
		};

		const middleware = internalS2SAuthMiddleware();
		middleware(mockReq as Request, mockRes as Response, mockNext);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockNext).not.toHaveBeenCalled();
	});

	it('should return 401 when x-caller-service header is missing', () => {
		const token = generateToken(env.S2S_AUDIENCE, {
			serviceName: S2S_CALLER_SERVICES.ORDER_SERVICE,
			privateKey: env.S2S_PRIVATE_KEY,
		});

		mockReq.headers = {
			authorization: `Bearer ${token}`,
		};

		const middleware = internalS2SAuthMiddleware();
		middleware(mockReq as Request, mockRes as Response, mockNext);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockNext).not.toHaveBeenCalled();
	});

	it('should authenticate successfully with valid S2S token from order-service', () => {
		const token = generateToken(env.S2S_AUDIENCE, {
			serviceName: S2S_CALLER_SERVICES.ORDER_SERVICE,
			privateKey: env.S2S_PRIVATE_KEY,
		});

		mockReq.headers = {
			authorization: `Bearer ${token}`,
			'x-caller-service': S2S_CALLER_SERVICES.ORDER_SERVICE,
		};

		const middleware = internalS2SAuthMiddleware();
		middleware(mockReq as Request, mockRes as Response, mockNext);

		expect(mockNext).toHaveBeenCalled();
		expect(mockReq.callerService).toBe(S2S_CALLER_SERVICES.ORDER_SERVICE);
	});

	it('should authenticate successfully with valid S2S token from restaurant-service', () => {
		const token = generateToken(env.S2S_AUDIENCE, {
			serviceName: S2S_CALLER_SERVICES.RESTAURANT_SERVICE,
			privateKey: env.S2S_PRIVATE_KEY,
		});

		mockReq.headers = {
			authorization: `Bearer ${token}`,
			'x-caller-service': S2S_CALLER_SERVICES.RESTAURANT_SERVICE,
		};

		const middleware = internalS2SAuthMiddleware();
		middleware(mockReq as Request, mockRes as Response, mockNext);

		expect(mockNext).toHaveBeenCalled();
		expect(mockReq.callerService).toBe(S2S_CALLER_SERVICES.RESTAURANT_SERVICE);
	});
});

describe('requireCallerService', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: jest.MockedFunction<NextFunction>;

	beforeEach(() => {
		mockReq = {};
		mockRes = {
			status: jest.fn().mockReturnThis() as never,
			json: jest.fn().mockReturnThis() as never,
		};
		mockNext = jest.fn() as unknown as jest.MockedFunction<NextFunction>;
	});

	it('should allow request when callerService matches allowed list', () => {
		mockReq.callerService = S2S_CALLER_SERVICES.RESTAURANT_SERVICE;
		const guard = requireCallerService([S2S_CALLER_SERVICES.RESTAURANT_SERVICE]);

		guard(mockReq as Request, mockRes as Response, mockNext);

		expect(mockNext).toHaveBeenCalled();
		expect(mockRes.status).not.toHaveBeenCalled();
	});

	it('should reject request with 403 when callerService does not match allowed list', () => {
		mockReq.callerService = S2S_CALLER_SERVICES.ORDER_SERVICE;
		const guard = requireCallerService([S2S_CALLER_SERVICES.RESTAURANT_SERVICE]);

		guard(mockReq as Request, mockRes as Response, mockNext);

		expect(mockNext).not.toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(403);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				success: false,
				error: 'FORBIDDEN',
			}),
		);
	});

	it('should reject request with 403 when callerService is missing', () => {
		mockReq.callerService = undefined;
		const guard = requireCallerService([S2S_CALLER_SERVICES.RESTAURANT_SERVICE]);

		guard(mockReq as Request, mockRes as Response, mockNext);

		expect(mockNext).not.toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(403);
	});
});
