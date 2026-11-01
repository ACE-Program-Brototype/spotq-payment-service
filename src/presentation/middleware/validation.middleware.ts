import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export const validate = (schema: ZodType) => {
	return (req: Request, _res: Response, next: NextFunction): void => {
		req.body = schema.parse(req.body);
		next();
	};
};

export function validateRequestBody(schema: ZodType) {
	return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
		req.body = await schema.parseAsync(req.body ?? {});
		next();
	};
}

export function validateRequestParams(schema: ZodType) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const parsed = await schema.parseAsync(req.params ?? {});
		res.locals.params = parsed;
		req.params = parsed as Record<string, string>;
		next();
	};
}

export function validateRequestQuery(schema: ZodType) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const parsed = await schema.parseAsync(req.query ?? {});
		res.locals.query = parsed;
		if (req.query && typeof req.query === 'object') {
			for (const key of Object.keys(req.query)) {
				delete (req.query as Record<string, unknown>)[key];
			}
			Object.assign(req.query, parsed);
		}
		next();
	};
}
