import type { RestaurantWalletWithdrawalMode } from '@shared/constants/restaurant-wallet.constants.ts';

export type { RestaurantWalletWithdrawalMode } from '@shared/constants/restaurant-wallet.constants.ts';

export interface WithdrawFromRestaurantWalletInputDTO {
	amountPaise: number;
	mode: RestaurantWalletWithdrawalMode;
	restaurantId: string;
}

export interface WithdrawFromRestaurantWalletOutputDTO {
	payoutId: string;
	withdrawnPaise: number;
	withdrawnFormatted: string;
	remainingBalancePaise: number;
	remainingBalanceFormatted: string;
	destination: {
		bankName: string;
		accountNumberMasked: string;
		mode: RestaurantWalletWithdrawalMode;
	};
	status: 'PROCESSING';
	createdAt: string;
}
