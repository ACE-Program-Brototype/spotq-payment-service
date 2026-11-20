import { RestaurantWallet } from '@domain/entities/restaurant-wallet.entity.ts';
import type { RestaurantWalletOverviewData } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import type { RestaurantWallet as PrismaRestaurantWallet } from '@prisma/client';

export type RestaurantWalletOverviewRecord = {
	walletId: string;
	walletRestaurantId: string;
	walletBalancePaise: bigint;
	walletCurrency: string;
	walletIsLocked: boolean;
	walletRazorpayFundAccountId: string | null;
	walletRazorpayContactId: string | null;
	walletBankName: string | null;
	walletBankAccountLast4: string | null;
	walletCreatedAt: Date;
	walletUpdatedAt: Date;
	todayCreditsPaise: bigint;
	todayRefundsPaise: bigint;
	withdrawnPaise: bigint;
	pendingWithdrawalsPaise: bigint;
	pendingPayoutsCount: bigint;
};

export const RestaurantWalletPersistenceMapper = {
	toPersistence(wallet: RestaurantWallet) {
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

	toUpdatePersistence(wallet: RestaurantWallet) {
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
			wallet: RestaurantWalletPersistenceMapper.toDomain({
				id: record.walletId,
				restaurantId: record.walletRestaurantId,
				balancePaise: record.walletBalancePaise,
				currency: record.walletCurrency,
				isLocked: record.walletIsLocked,
				razorpayFundAccountId: record.walletRazorpayFundAccountId,
				razorpayContactId: record.walletRazorpayContactId,
				bankName: record.walletBankName,
				bankAccountLast4: record.walletBankAccountLast4,
				createdAt: record.walletCreatedAt,
				updatedAt: record.walletUpdatedAt,
			}),
			todayStats: {
				todayCreditsPaise: record.todayCreditsPaise,
				todayRefundsPaise: record.todayRefundsPaise,
				withdrawnPaise: record.withdrawnPaise,
				pendingWithdrawalsPaise: record.pendingWithdrawalsPaise,
				pendingPayoutsCount: Number(record.pendingPayoutsCount),
			},
		};
	},
};
