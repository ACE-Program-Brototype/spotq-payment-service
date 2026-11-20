import { HTTP_STATUS, MESSAGES } from '@shared/constants';
import { sendErrorResponse } from '@shared/index';
import type { NextFunction, Request, Response } from 'express';

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
		sendErrorResponse(res, MESSAGES.GATEWAY_UNAUTHORIZED, 'UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED);
		return;
	}

	const role = getHeaderValue(req.headers['x-user-role']);
	const normalizedRole = role?.toLowerCase().trim();

	if (!normalizedRole || !ALLOWED_ADMIN_ROLES.has(normalizedRole)) {
		sendErrorResponse(res, MESSAGES.ADMIN_FORBIDDEN, 'FORBIDDEN', HTTP_STATUS.FORBIDDEN);
		return;
	}

	const email = getHeaderValue(req.headers['x-user-email']);

	req.user = {
		userId,
		email: email || '',
		role: normalizedRole,
	};
	req.userId = userId;

	next();
}
