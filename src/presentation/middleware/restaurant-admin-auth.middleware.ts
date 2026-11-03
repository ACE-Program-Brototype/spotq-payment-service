import { ERROR_CODES, HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import { sendErrorResponse } from '@shared/response/api-response.ts';
import type { NextFunction, Request, Response } from 'express';

const ALLOWED_ROLES = new Set(['RESTAURANT_ADMIN', 'RESTAURANT_STAFF']);

export function restaurantAdminAuthMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const restaurantId = req.headers['x-restaurant-id'] as string | undefined;
	const userId = req.headers['x-user-id'] as string | undefined;
	const userRole = req.headers['x-user-role'] as string | undefined;

	if (!restaurantId || !userId) {
		sendErrorResponse(
			res,
			MESSAGES.UNAUTHORIZED_ACCESS,
			ERROR_CODES.UNAUTHORIZED,
			HTTP_STATUS.UNAUTHORIZED,
		);
		return;
	}

	if (!userRole || !ALLOWED_ROLES.has(userRole)) {
		sendErrorResponse(res, MESSAGES.FORBIDDEN_ACCESS, ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
		return;
	}

	next();
}
