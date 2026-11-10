import { HTTP_HEADERS } from '@shared/constants';
import { MESSAGES } from '@shared/constants/message.constants.ts';
import { RESTAURANT_WALLET_WITHDRAWAL_MODES } from '@shared/constants/restaurant-wallet.constants.ts';
import { z } from 'zod';

export const withdrawFromRestaurantWalletBodySchema = z.object({
	amountPaise: z
		.number({ error: MESSAGES.WITHDRAWAL_AMOUNT_REQUIRED })
		.int(MESSAGES.WITHDRAWAL_AMOUNT_REQUIRED)
		.positive(MESSAGES.WITHDRAWAL_AMOUNT_REQUIRED),
	mode: z.enum(Object.values(RESTAURANT_WALLET_WITHDRAWAL_MODES), {
		message: MESSAGES.INVALID_WITHDRAWAL_MODE,
	}),
});

export const withdrawFromRestaurantWalletHeadersSchema = z.object({
	[HTTP_HEADERS.X_IDEMPOTENCY_KEY]: z.string().trim().min(1, MESSAGES.IDEMPOTENCY_KEY_REQUIRED),
});

export type WithdrawFromRestaurantWalletBody = z.infer<
	typeof withdrawFromRestaurantWalletBodySchema
>;
