import { HTTP_STATUS, MESSAGES } from '@shared/constants';
import { ErrorResponse } from '@shared/index';
import type { AuthenticatedUser } from '@shared/types/express';
import type { NextFunction, Request, Response } from 'express';

export interface AuthenticatedAdminRequest extends Request {
	user?: AuthenticatedUser;
	userId?: string;
}

function getHeaderValue(header: string | string[] | undefined): string | undefined {
	if (Array.isArray(header)) {
		return header[0];
	}
	return header;
}

const ALLOWED_ADMIN_ROLES = new Set(['admin']);

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
	const userId = getHeaderValue(req.headers['x-user-id']);

	if (!userId) {
		res
			.status(HTTP_STATUS.UNAUTHORIZED)
			.json(
				new ErrorResponse(MESSAGES.GATEWAY_UNAUTHORIZED, 'UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED),
			);
		return;
	}

	const role = getHeaderValue(req.headers['x-user-role']);
	const normalizedRole = role?.toLowerCase().trim();

	if (!normalizedRole || !ALLOWED_ADMIN_ROLES.has(normalizedRole)) {
		res
			.status(HTTP_STATUS.FORBIDDEN)
			.json(new ErrorResponse(MESSAGES.ADMIN_FORBIDDEN, 'FORBIDDEN', HTTP_STATUS.FORBIDDEN));
		return;
	}

	const email = getHeaderValue(req.headers['x-user-email']);

	(req as AuthenticatedAdminRequest).user = {
		userId,
		email: email || '',
		role: normalizedRole,
	};
	(req as AuthenticatedAdminRequest).userId = userId;

	next();
}
