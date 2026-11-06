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
	toPersistance(wallet: RestaurantWallet) {
		return {
			id: wallet.id,
			restaurantId: wallet.restaurantId,
			balancePaise: wallet.balancePaise,
			currency: wallet.currency,
			isLocked: wallet.isLocked,
			razorpayFundAccountId: wallet.razorpayFundAccountId,
			razorpayContactId: wallet.razorpayContactId,
			bankName: wallet.bankName,
			bankAccountLast4: wallet.bankAccountLast4,
			createdAt: wallet.createdAt,
			updatedAt: wallet.updatedAt,
		};
	},

	toUpdatePersistance(wallet: RestaurantWallet) {
		return {
			balancePaise: wallet.balancePaise,
			currency: wallet.currency,
			isLocked: wallet.isLocked,
			razorpayFundAccountId: wallet.razorpayFundAccountId,
			razorpayContactId: wallet.razorpayContactId,
			bankName: wallet.bankName,
			bankAccountLast4: wallet.bankAccountLast4,
		};
	},

	toDomain(record: PrismaRestaurantWallet): RestaurantWallet {
		return new RestaurantWallet({
			id: record.id,
			restaurantId: record.restaurantId,
			balancePaise: record.balancePaise,
			currency: record.currency,
			isLocked: record.isLocked,
			razorpayFundAccountId: record.razorpayFundAccountId,
			razorpayContactId: record.razorpayContactId,
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
