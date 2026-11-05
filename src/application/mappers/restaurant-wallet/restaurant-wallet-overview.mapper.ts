import type { GetRestaurantWalletOverviewOutputDTO } from '@application/dtos/restaurant-wallet/get-restaurant-wallet-overview.dto';
import type { RestaurantWalletOverviewData } from '@domain/repositories/restaurant-wallet.repository.interface.ts';

export const RestaurantWalletOverviewMapper = {
	toDto(overview: RestaurantWalletOverviewData): GetRestaurantWalletOverviewOutputDTO {
		const wallet = overview.wallet;
		return {
			walletId: wallet.id,
			restaurantId: wallet.restaurantId,
			balancePaise: Number(wallet.balancePaise),
			currency: wallet.currency,
			isLocked: wallet.isLocked,
			linkedBankAccount:
				wallet.bankName !== null && wallet.bankAccountLast4 !== null
					? {
							isLinked: true,
							bankName: wallet.bankName,
							accountNumberMasked: `•••• •••• ${wallet.bankAccountLast4}`,
						}
					: null,
			todayStats: {
				todayCreditsPaise: Number(overview.todayStats.todayCreditsPaise),
				todayRefundsPaise: Number(overview.todayStats.todayRefundsPaise),
				withdrawnPaise: Number(overview.todayStats.withdrawnPaise),
				pendingPayoutsCount: overview.todayStats.pendingPayoutsCount,
			},
		};
	},
};
