import { env } from '@config/env.ts';
import { S2S_CALLER_SERVICES } from '@shared/constants/auth.constants.ts';
import { authMiddleware } from '@spotq-org/s2s-core';
import type { RequestHandler } from 'express';

export function internalS2SAuthMiddleware(): RequestHandler {
	return authMiddleware({
		expectedAudience: env.S2S_AUDIENCE || env.SERVICE_NAME,
		publicKeys: {
			[S2S_CALLER_SERVICES.ORDER_SERVICE]: env.ORDER_S2S_PUBLIC_KEY,
		},
	});
}
