import type { WithdrawFromRestaurantWalletOutputDTO } from '@application/dtos/restaurant-wallet/withdraw-from-restaurant-wallet.dto.ts';
import { WALLET_LEDGER_STATUSES } from '@domain/constants/wallet-ledger.constants';
import type { WalletWithdrawalReservation } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import type { RestaurantWalletWithdrawalMode } from '@shared/constants/restaurant-wallet.constants.ts';

export const WithdrawFromRestaurantWalletMapper = {
	toDto(
		payoutId: string,
		reservation: WalletWithdrawalReservation,
		mode: RestaurantWalletWithdrawalMode,
	): WithdrawFromRestaurantWalletOutputDTO {
		return {
			payoutId,
			withdrawnPaise: Number(reservation.withdrawnPaise),
			remainingBalancePaise: Number(reservation.remainingBalancePaise),
			destination: {
				bankName: reservation.bankName,
				accountNumberMasked: `•••• •••• ${reservation.bankAccountLast4}`,
				mode,
			},
			status: WALLET_LEDGER_STATUSES.PROCESSING,
			createdAt: reservation.createdAt.toISOString(),
		};
	},
};
