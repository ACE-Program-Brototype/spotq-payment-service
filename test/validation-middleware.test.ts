import {
	validateRequestBody,
	validateRequestHeaders,
	validateRequestParams,
	validateRequestQuery,
} from '@presentation/middleware/validation.middleware.ts';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

describe('Validation Middleware', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let nextFn: NextFunction;

	const testSchema = z.object({
		name: z.string().min(2),
		age: z.number().int().positive(),
	});

	beforeEach(() => {
		mockReq = {
			body: {},
			params: {},
			query: {},
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			locals: {},
		};
		nextFn = jest.fn();
	});

	describe('validateRequestBody', () => {
		it('should throw ZodError on invalid body', async () => {
			mockReq.body = { name: 'A', age: -1 };

			await expect(
				validateRequestBody(testSchema)(mockReq as Request, mockRes as Response, nextFn),
			).rejects.toThrow(z.ZodError);

			expect(nextFn).not.toHaveBeenCalled();
		});

		it('should call next() and assign parsed data on valid body', async () => {
			mockReq.body = { name: 'Bob', age: 30 };

			await validateRequestBody(testSchema)(mockReq as Request, mockRes as Response, nextFn);

			expect(mockReq.body).toEqual({ name: 'Bob', age: 30 });
			expect(nextFn).toHaveBeenCalledTimes(1);
		});
	});

	describe('validateRequestQuery', () => {
		it('should throw ZodError on invalid query parameters', async () => {
			mockReq.query = { name: 'B' } as unknown as Request['query'];

			await expect(
				validateRequestQuery(testSchema)(mockReq as Request, mockRes as Response, nextFn),
			).rejects.toThrow(z.ZodError);

			expect(nextFn).not.toHaveBeenCalled();
		});

		it('should assign parsed query to res.locals.query and req.query on valid query', async () => {
			mockReq.query = { name: 'Charlie', age: 40 } as unknown as Request['query'];

			await validateRequestQuery(testSchema)(mockReq as Request, mockRes as Response, nextFn);

			expect(mockRes.locals?.query).toEqual({ name: 'Charlie', age: 40 });
			expect(nextFn).toHaveBeenCalledTimes(1);
		});
	});

	describe('validateRequestParams', () => {
		const paramSchema = z.object({
			orderId: z.string().uuid(),
		});

		it('should throw ZodError on invalid params', async () => {
			mockReq.params = { orderId: 'not-a-uuid' };

			await expect(
				validateRequestParams(paramSchema)(mockReq as Request, mockRes as Response, nextFn),
			).rejects.toThrow(z.ZodError);

			expect(nextFn).not.toHaveBeenCalled();
		});

		it('should assign parsed params to res.locals.params and req.params on valid params', async () => {
			const validUuid = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
			mockReq.params = { orderId: validUuid };

			await validateRequestParams(paramSchema)(mockReq as Request, mockRes as Response, nextFn);

			expect(mockReq.params).toEqual({ orderId: validUuid });
			expect(mockRes.locals?.params).toEqual({ orderId: validUuid });
			expect(nextFn).toHaveBeenCalledTimes(1);
		});
	});

	describe('validateRequestHeaders', () => {
		const headerSchema = z
			.object({
				'x-idempotency-key': z.string().min(1),
			})
			.passthrough();

		it('should throw ZodError on invalid headers', async () => {
			mockReq.headers = {};

			await expect(
				validateRequestHeaders(headerSchema)(mockReq as Request, mockRes as Response, nextFn),
			).rejects.toThrow(z.ZodError);

			expect(nextFn).not.toHaveBeenCalled();
		});

		it('should call next() on valid headers', async () => {
			mockReq.headers = { 'x-idempotency-key': 'test-123' };

			await validateRequestHeaders(headerSchema)(mockReq as Request, mockRes as Response, nextFn);

			expect(nextFn).toHaveBeenCalledTimes(1);
		});
	});
});
