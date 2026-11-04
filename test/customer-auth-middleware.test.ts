import {
	customerAuthMiddleware,
	getHeaderValue,
} from '@presentation/middleware/customer-auth.middleware.ts';
import { HTTP_STATUS, messages } from '@shared/constants/index.ts';
import { ForbiddenError, UnauthorizedError } from '@shared/errors/index.ts';
import type { NextFunction, Request, Response } from 'express';

describe('Customer Auth Middleware', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let nextFn: NextFunction;

	beforeEach(() => {
		mockReq = {
			headers: {},
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		};
		nextFn = jest.fn();
	});

	describe('getHeaderValue', () => {
		it('should return string value when single string is provided', () => {
			expect(getHeaderValue('test-val')).toBe('test-val');
		});

		it('should return first string when string array is provided', () => {
			expect(getHeaderValue(['first-val', 'second-val'])).toBe('first-val');
		});

		it('should return undefined when undefined is provided', () => {
			expect(getHeaderValue(undefined)).toBeUndefined();
		});
	});

	describe('customerAuthMiddleware', () => {
		it('should throw UnauthorizedError when x-user-id is missing', () => {
			try {
				customerAuthMiddleware(mockReq as Request, mockRes as Response, nextFn);
				fail('Expected UnauthorizedError to be thrown');
			} catch (err) {
				expect(err).toBeInstanceOf(UnauthorizedError);
				expect((err as UnauthorizedError).statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
				expect((err as UnauthorizedError).code).toBe('UNAUTHORIZED');
				expect((err as UnauthorizedError).message).toBe(messages.CUSTOMER_AUTH_REQUIRED);
			}
			expect(nextFn).not.toHaveBeenCalled();
		});

		it('should throw ForbiddenError when x-user-role is explicitly not customer', () => {
			mockReq.headers = {
				'x-user-id': 'usr-cust-1',
				'x-user-role': 'staff',
			};

			try {
				customerAuthMiddleware(mockReq as Request, mockRes as Response, nextFn);
				fail('Expected ForbiddenError to be thrown');
			} catch (err) {
				expect(err).toBeInstanceOf(ForbiddenError);
				expect((err as ForbiddenError).statusCode).toBe(HTTP_STATUS.FORBIDDEN);
				expect((err as ForbiddenError).code).toBe('FORBIDDEN');
				expect((err as ForbiddenError).message).toBe(messages.CUSTOMER_UNAUTHORIZED);
			}
			expect(nextFn).not.toHaveBeenCalled();
		});

		it('should populate req.user and call next() when valid customer headers are provided', () => {
			mockReq.headers = {
				'x-user-id': 'usr-cust-1',
				'x-user-role': 'CUSTOMER',
				'x-user-email': 'customer@example.com',
			};

			customerAuthMiddleware(mockReq as Request, mockRes as Response, nextFn);

			expect(mockRes.status).not.toHaveBeenCalled();
			expect(mockReq.user).toEqual({
				userId: 'usr-cust-1',
				email: 'customer@example.com',
				role: 'CUSTOMER',
			});
			expect(nextFn).toHaveBeenCalledTimes(1);
		});
	});
});
