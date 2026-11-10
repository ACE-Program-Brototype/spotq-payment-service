import { env } from '@config/env.ts';
import { S2S_CALLER_SERVICES } from '@shared/constants/auth.constants.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import { ERROR_CODES, MESSAGES } from '@shared/constants/message.constants.ts';
import { ApiResponse } from '@shared/utils/response.ts';
import { authMiddleware } from '@spotq-org/s2s-core';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function internalS2SAuthMiddleware(): RequestHandler {
	return authMiddleware({
		expectedAudience: env.S2S_AUDIENCE || env.SERVICE_NAME,
		publicKeys: {
			[S2S_CALLER_SERVICES.ORDER_SERVICE]: env.ORDER_S2S_PUBLIC_KEY,
			[S2S_CALLER_SERVICES.RESTAURANT_SERVICE]: env.RESTAURANT_S2S_PUBLIC_KEY,
		},
	});
}

export function requireCallerService(allowedServices: string | readonly string[]): RequestHandler {
	const allowed = Array.isArray(allowedServices) ? allowedServices : [allowedServices];

	return (req: Request, res: Response, next: NextFunction): void => {
		if (!req.callerService || !allowed.includes(req.callerService)) {
			res.status(HTTP_STATUS.FORBIDDEN).json(
				ApiResponse.error(ERROR_CODES.FORBIDDEN, MESSAGES.S2S_CALLER_FORBIDDEN, {
					callerService: req.callerService ?? 'UNKNOWN',
				}),
			);
			return;
		}
		next();
	};
}
