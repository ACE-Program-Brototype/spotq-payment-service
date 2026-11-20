import { messages } from '@shared/constants/index.ts';
import { ForbiddenError, UnauthorizedError } from '@shared/errors/index.ts';
import type { NextFunction, Request, Response } from 'express';

export function getHeaderValue(header: string | string[] | undefined): string | undefined {
	if (Array.isArray(header)) {
		return header[0];
	}
	return header;
}

export function customerAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
	const userId = getHeaderValue(req.headers['x-user-id']);

	if (!userId) {
		throw new UnauthorizedError(messages.CUSTOMER_AUTH_REQUIRED);
	}

	const role = getHeaderValue(req.headers['x-user-role']);
	const normalizedRole = role?.toLowerCase();

	if (normalizedRole && normalizedRole !== 'customer') {
		throw new ForbiddenError(messages.CUSTOMER_UNAUTHORIZED);
	}

	const email = getHeaderValue(req.headers['x-user-email']);

	req.user = {
		userId,
		email: email || '',
		role: role || 'CUSTOMER',
	};

	next();
}
