import type { WalletLedgerStatus } from '@domain/constants/wallet-ledger.constants';
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
	remainingBalancePaise: number;
	destination: {
		bankName: string;
		accountNumberMasked: string;
		mode: RestaurantWalletWithdrawalMode;
	};
	status: WalletLedgerStatus;
	createdAt: string;
}
