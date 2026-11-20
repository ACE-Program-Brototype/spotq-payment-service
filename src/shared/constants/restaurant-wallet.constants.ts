export const RESTAURANT_WALLET_WITHDRAWAL_MODES = {
	IMPS: 'IMPS',
	NEFT: 'NEFT',
	RTGS: 'RTGS',
	UPI: 'UPI',
} as const;

export type RestaurantWalletWithdrawalMode =
	(typeof RESTAURANT_WALLET_WITHDRAWAL_MODES)[keyof typeof RESTAURANT_WALLET_WITHDRAWAL_MODES];
