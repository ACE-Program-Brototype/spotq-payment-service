import { DomainError } from '@domain/errors/payment.errors.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	ERROR_CODES,
	getStatusCodeForDomainError,
	HTTP_STATUS,
	MESSAGES,
} from '@shared/constants/index.ts';
import { AppError } from '@shared/errors/index.ts';
import { sendErrorResponse } from '@shared/response/api-response.ts';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export function errorMiddleware(
	err: unknown,
	req: Request,
	res: Response,
	_next: NextFunction,
): void {
	if (err instanceof AppError) {
		sendErrorResponse(res, err.message, err.code, err.statusCode, err.details);
		return;
	}

	if (
		err instanceof z.ZodError ||
		(err && typeof err === 'object' && 'name' in err && err.name === 'ZodError')
	) {
		const zodError = err as z.ZodError;
		const formattedErrors = zodError.issues.map((issue) => ({
			field: issue.path.length > 0 ? issue.path.join('.') : 'body',
			message: issue.message,
		}));

		sendErrorResponse(
			res,
			MESSAGES.VALIDATION_ERROR,
			ERROR_CODES.VALIDATION_ERROR,
			HTTP_STATUS.UNPROCESSABLE_ENTITY,
			formattedErrors,
		);
		return;
	}

	if (err instanceof DomainError) {
		const statusCode = getStatusCodeForDomainError(err.code, HTTP_STATUS.BAD_REQUEST);
		sendErrorResponse(res, err.message, err.code, statusCode);
		return;
	}

	logger.error({ err, method: req.method, url: req.url }, MESSAGES.UNHANDLED_ERROR);

	const message =
		process.env.NODE_ENV === 'production'
			? MESSAGES.UNEXPECTED_ERROR
			: err instanceof Error
				? err.message
				: MESSAGES.INTERNAL_SERVER_ERROR;

	sendErrorResponse(
		res,
		message,
		ERROR_CODES.INTERNAL_SERVER_ERROR,
		HTTP_STATUS.INTERNAL_SERVER_ERROR,
	);
}
