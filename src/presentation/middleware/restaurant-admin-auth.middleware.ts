import { ERROR_CODES, HTTP_STATUS, MESSAGES, USER_ROLES } from '@shared/constants/index.ts';
import { sendErrorResponse } from '@shared/response/api-response.ts';
import type { NextFunction, Request, Response } from 'express';

const ALLOWED_ROLES = new Set<string>([
	USER_ROLES.PLATFORM_ADMIN,
	USER_ROLES.ADMIN,
	USER_ROLES.RESTAURANT_ADMIN,
	USER_ROLES.STAFF,
]);

function normalizeRole(role?: string): string | undefined {
	if (!role) {
		return undefined;
	}
	const trimmed = role.toUpperCase().trim();
	if (trimmed === 'RESTAURANT_OWNER' || trimmed === 'OWNER') {
		return USER_ROLES.RESTAURANT_ADMIN;
	}
	if (trimmed === 'RESTAURANT_STAFF') {
		return USER_ROLES.STAFF;
	}
	return trimmed;
}

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

	const normalizedRole = normalizeRole(userRole);

	if (!normalizedRole || !ALLOWED_ROLES.has(normalizedRole)) {
		sendErrorResponse(res, MESSAGES.FORBIDDEN_ACCESS, ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
		return;
	}

	const email = (req.headers['x-user-email'] as string) || '';

	req.user = {
		userId,
		restaurantId,
		email,
		role: normalizedRole,
	};

	next();
}

export function verifyRestaurantTenantAccess(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const user = req.user;
	const targetRestaurantId = req.params?.restaurantId;

	if (
		targetRestaurantId &&
		user?.role !== USER_ROLES.PLATFORM_ADMIN &&
		user?.role !== USER_ROLES.ADMIN
	) {
		if (user?.restaurantId !== targetRestaurantId) {
			sendErrorResponse(
				res,
				MESSAGES.FORBIDDEN_SUBSCRIPTION_ACCESS,
				'FORBIDDEN_SUBSCRIPTION_ACCESS',
				HTTP_STATUS.FORBIDDEN,
			);
			return;
		}
	}

	next();
}
