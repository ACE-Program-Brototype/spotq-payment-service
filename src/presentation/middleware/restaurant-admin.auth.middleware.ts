import { ALLOWED_ROLES, HTTP_STATUS, MESSAGES } from '@shared/constants';
import { ApiResponse } from '@shared/index';
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

const allowedRoles = new Set<string>(ALLOWED_ROLES);

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
	const userId = headerUserId || headerRestaurantId;

	if (!userId) {
		res
			.status(HTTP_STATUS.UNAUTHORIZED)
			.json(
				ApiResponse.error(MESSAGES.GATEWAY_UNAUTHORIZED, 'UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED),
			);
		return;
	}

	const role = getHeaderValue(req.headers['x-user-role']);
	const normalizedRole = role?.toLowerCase().trim();

	if (!normalizedRole || !allowedRoles.has(normalizedRole)) {
		res
			.status(HTTP_STATUS.FORBIDDEN)
			.json(ApiResponse.error(MESSAGES.OWNER_FORBIDDEN, 'FORBIDDEN', HTTP_STATUS.FORBIDDEN));
		return;
	}

	const paramRestaurantId = getHeaderValue(req.params?.restaurantId || req.params?.id)?.trim();

	const email = getHeaderValue(req.headers['x-user-email']);
	const restaurantId = headerRestaurantId || userId;

	if (paramRestaurantId && restaurantId && paramRestaurantId !== restaurantId.trim()) {
		res
			.status(HTTP_STATUS.FORBIDDEN)
			.json(ApiResponse.error(MESSAGES.FORBIDDEN_ACCESS, 'FORBIDDEN', HTTP_STATUS.FORBIDDEN));
		return;
	}

	req.user = {
		userId,
		restaurantId: restaurantId || '',
		email: email || '',
		role: role || 'RESTAURANT_OWNER',
	};

	req.userId = userId;

	next();
}
