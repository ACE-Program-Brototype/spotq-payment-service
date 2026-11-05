import type { GetRestaurantWalletOverviewOutputDTO } from '@application/dtos/get-restaurant-wallet-overview.dto.ts';
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
				wallet.razorpayFundAccountId !== null
					? {
							isLinked: true,
							bankName: wallet.bankName,
							accountNumberMasked: wallet.bankAccountLast4
								? `•••• •••• ${wallet.bankAccountLast4}`
								: null,
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
