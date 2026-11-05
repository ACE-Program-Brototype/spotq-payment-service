import { ERROR_CODES, HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import { sendErrorResponse } from '@shared/response/api-response.ts';
import type { NextFunction, Request, Response } from 'express';

const ALLOWED_ROLES = new Set([
	'RESTAURANT_OWNER',
	'RESTAURANT_ADMIN',
	'RESTAURANT',
	'OWNER',
	'ADMIN',
	'PLATFORM_ADMIN',
	'SUPER_ADMIN',
	'STAFF',
	'RESTAURANT_STAFF',
	'MANAGER',
]);

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

	const normalizedRole = userRole?.toUpperCase().trim();

	if (!normalizedRole || !ALLOWED_ROLES.has(normalizedRole)) {
		sendErrorResponse(res, MESSAGES.FORBIDDEN_ACCESS, ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
		return;
	}

	next();
}
