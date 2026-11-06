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

export type WithdrawFromRestaurantWalletBody = z.infer<
	typeof withdrawFromRestaurantWalletBodySchema
>;
