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
			ERROR_CODES.UNAUTHORIZED,
			MESSAGES.UNAUTHORIZED_ACCESS,
			HTTP_STATUS.UNAUTHORIZED,
		);
		return;
	}

	const normalizedRole = userRole?.toUpperCase().trim();

	if (!normalizedRole || !ALLOWED_ROLES.has(normalizedRole)) {
		sendErrorResponse(res, ERROR_CODES.FORBIDDEN, MESSAGES.FORBIDDEN_ACCESS, HTTP_STATUS.FORBIDDEN);
		return;
	}

	next();
}
