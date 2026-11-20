import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export function validateRequestBody(schema: ZodType) {
	return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
		req.body = await schema.parseAsync(req.body ?? {});
		next();
	};
}

export function validateRequestParams(schema: ZodType) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const parsed = await schema.parseAsync(req.params ?? {});
		if (res.locals) {
			res.locals.params = parsed;
		}
		Object.defineProperty(req, 'params', { value: parsed, writable: true, configurable: true });
		next();
	};
}

export function validateRequestQuery(schema: ZodType) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const parsed = await schema.parseAsync(req.query ?? {});
		if (res.locals) {
			res.locals.query = parsed;
		}
		Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
		next();
	};
}

export function validateRequestHeaders(schema: ZodType) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const parsed = await schema.parseAsync(req.headers ?? {});
		res.locals.headers = parsed;
		next();
	};
}
