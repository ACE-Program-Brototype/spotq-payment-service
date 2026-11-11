import {
	ALLOWED_RESTAURANT_OWNER_ROLE,
	ERROR_CODES,
	HTTP_STATUS,
	MESSAGES,
} from '@shared/constants/index.ts';
import { ApiResponse, sendErrorResponse } from '@shared/index.ts';
import type { NextFunction, Request, Response } from 'express';

/**
 * Extracts a normalized single string value from a potential array of header values.
 */
function getHeaderValue(header: string | string[] | undefined): string | undefined {
	if (Array.isArray(header)) {
		return header[0];
	}
	return header;
}

/**
 * Authentication and authorization middleware verifying that requests originating
 * from the API gateway carry a valid restaurant owner identity.
 */
export function restaurantAdminAuthMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const headerUserId = getHeaderValue(req.headers['x-user-id']);
	const headerRestaurantId = getHeaderValue(req.headers['x-restaurant-id']);
	const userId = headerUserId;
	const restaurantId = headerRestaurantId;

	if (!restaurantId || !userId) {
		sendErrorResponse(
			res,
			MESSAGES.UNAUTHORIZED_ACCESS,
			ERROR_CODES.UNAUTHORIZED,
			HTTP_STATUS.UNAUTHORIZED,
		);
		return;
	}

	const role = getHeaderValue(req.headers['x-user-role']);
	const normalizedRole = role?.toUpperCase().trim();

	if (!normalizedRole || ALLOWED_RESTAURANT_OWNER_ROLE !== normalizedRole) {
		res
			.status(HTTP_STATUS.FORBIDDEN)
			.json(ApiResponse.error('FORBIDDEN', MESSAGES.OWNER_FORBIDDEN, HTTP_STATUS.FORBIDDEN));
		return;
	}

	const email = getHeaderValue(req.headers['x-user-email']);

	req.user = {
		userId,
		restaurantId,
		email,
		role: normalizedRole,
	};

	req.userId = userId;

	next();
}

export function verifyRestaurantTenantAccess(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const user = req.user;
	const targetRestaurantId = req.params?.restaurantId;

	if (targetRestaurantId && user?.restaurantId !== targetRestaurantId) {
		sendErrorResponse(
			res,
			MESSAGES.FORBIDDEN_SUBSCRIPTION_ACCESS,
			'FORBIDDEN_SUBSCRIPTION_ACCESS',
			HTTP_STATUS.FORBIDDEN,
		);
		return;
	}

	next();
}
