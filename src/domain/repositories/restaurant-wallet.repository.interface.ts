import type { RestaurantWallet } from '../entities/restaurant-wallet.entity.ts';
import type { WalletWithdrawalFailureStatus } from '../constants/wallet-ledger.constants.ts';
import type { IBaseRepository } from './base.repository.interface.ts';

export interface RestaurantWalletTodayStats {
	todayCreditsPaise: bigint;
	todayRefundsPaise: bigint;
	withdrawnPaise: bigint;
	pendingPayoutsCount: number;
}

export interface RestaurantWalletOverviewData {
	wallet: RestaurantWallet;
	todayStats: RestaurantWalletTodayStats;
}

export interface WalletWithdrawalReservation {
	withdrawalReference: string;
	withdrawnPaise: bigint;
	remainingBalancePaise: bigint;
	createdAt: Date;
	bankName: string;
	bankAccountLast4: string;
	fundAccountId: string;
}

export interface IRestaurantWalletRepository extends IBaseRepository<RestaurantWallet> {
	findById(id: string): Promise<RestaurantWallet | null>;
	findByRestaurantId(restaurantId: string): Promise<RestaurantWallet | null>;
	create(data: RestaurantWallet): Promise<RestaurantWallet>;
	update(id: string, data: RestaurantWallet): Promise<RestaurantWallet>;
	getOverview(restaurantId: string): Promise<RestaurantWalletOverviewData | null>;
	getTodayNetEarningsPaise(
		restaurantId: string,
		businessDayStart: Date,
		nextBusinessDayStart: Date,
	): Promise<bigint>;
	reserveWithdrawal(
		restaurantId: string,
		amountPaise: bigint,
		reference: string,
	): Promise<WalletWithdrawalReservation>;
	markWithdrawalProcessed(reference: string, utrNumber?: string | null): Promise<void>;
	failWithdrawal(reference: string, status?: WalletWithdrawalFailureStatus): Promise<void>;
}
