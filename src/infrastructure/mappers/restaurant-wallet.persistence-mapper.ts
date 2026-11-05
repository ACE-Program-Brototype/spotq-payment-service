import { RestaurantWallet } from '@domain/entities/restaurant-wallet.entity.ts';
import type {
	RestaurantWalletOverviewData,
	RestaurantWalletTodayStats,
} from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import type { RestaurantWallet as PrismaRestaurantWallet } from '@prisma/client';

export type RestaurantWalletOverviewRecord = {
	wallet: PrismaRestaurantWallet;
} & RestaurantWalletTodayStats;

export const RestaurantWalletPersistenceMapper = {
	toDomain(record: PrismaRestaurantWallet): RestaurantWallet {
		return new RestaurantWallet({
			id: record.id,
			restaurantId: record.restaurantId,
			balancePaise: record.balancePaise,
			currency: record.currency,
			isLocked: record.isLocked,
			razorpayFundAccountId: record.razorpayFundAccountId,
			bankName: record.bankName,
			bankAccountLast4: record.bankAccountLast4,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	},

	toOverview(record: RestaurantWalletOverviewRecord): RestaurantWalletOverviewData {
		return {
			wallet: RestaurantWalletPersistenceMapper.toDomain(record.wallet),
			todayStats: {
				todayCreditsPaise: record.todayCreditsPaise,
				todayRefundsPaise: record.todayRefundsPaise,
				withdrawnPaise: record.withdrawnPaise,
				pendingPayoutsCount: record.pendingPayoutsCount,
			},
		};
	},
};
