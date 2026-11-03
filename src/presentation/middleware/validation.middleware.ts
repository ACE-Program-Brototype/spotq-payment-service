import { HTTP_STATUS, type HttpStatusCode, MESSAGES } from '@shared/constants';
import { ApiResponse } from '@shared/utils/response.ts';
import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { z } from 'zod';

function sendValidationError(
	res: Response,
	error: z.ZodError,
	statusCode: HttpStatusCode,
	fallbackField: string,
): void {
	const formattedErrors = error.issues.map((issue) => ({
		field: issue.path.length > 0 ? issue.path.join('.') : fallbackField,
		message: issue.message,
	}));

	res
		.status(statusCode)
		.json(ApiResponse.error('VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, formattedErrors));
}

export const validate = (schema: ZodType) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.body);

		if (!result.success) {
			res
				.status(HTTP_STATUS.BAD_REQUEST)
				.json(
					ApiResponse.error('VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, result.error.flatten()),
				);

			return;
		}

		req.body = result.data;

		next();
	};
};

export function validateRequestBody(schema: ZodType) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			req.body = await schema.parseAsync(req.body ?? {});
			next();
		} catch (error) {
			if (error instanceof z.ZodError) {
				sendValidationError(res, error, HTTP_STATUS.UNPROCESSABLE_ENTITY, 'body');
				return;
			}
			next(error);
		}
	};
}

export function validateRequestQuery(
	schema: ZodType,
	errorStatusCode: HttpStatusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY,
) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const parsed = await schema.parseAsync(req.query ?? {});
			res.locals.query = parsed;
			next();
		} catch (error) {
			if (error instanceof z.ZodError) {
				sendValidationError(res, error, errorStatusCode, 'query');
				return;
			}
			next(error);
		}
	};
}

export function validateRequestParams(schema: ZodType) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const parsed = await schema.parseAsync(req.params ?? {});
			res.locals.params = parsed;
			req.params = parsed as Record<string, string>;
			next();
		} catch (error) {
			if (error instanceof z.ZodError) {
				sendValidationError(res, error, HTTP_STATUS.UNPROCESSABLE_ENTITY, 'params');
				return;
			}
			next(error);
		}
	};
}
