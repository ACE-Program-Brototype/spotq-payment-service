import { env } from '@config/env.ts';
import { S2S_CALLER_SERVICES } from '@shared/constants/auth.constants.ts';
import { authMiddleware } from '@spotq-org/s2s-core';
import type { RequestHandler } from 'express';

export function internalS2SAuthMiddleware(
	allowedCallers?: string | readonly string[],
): RequestHandler {
	const allKeys: Record<string, string> = {
		[S2S_CALLER_SERVICES.ORDER_SERVICE]: env.ORDER_S2S_PUBLIC_KEY,
		[S2S_CALLER_SERVICES.RESTAURANT_SERVICE]: env.RESTAURANT_S2S_PUBLIC_KEY,
	};

	let publicKeys = allKeys;
	if (allowedCallers) {
		const allowed = Array.isArray(allowedCallers) ? allowedCallers : [allowedCallers];
		publicKeys = Object.fromEntries(
			allowed.filter((caller) => allKeys[caller]).map((caller) => [caller, allKeys[caller]]),
		);
	}

	return authMiddleware({
		expectedAudience: env.S2S_AUDIENCE || env.SERVICE_NAME,
		publicKeys,
	});
}
