import { WALLET_LEDGER_TYPES } from '@domain/constants/wallet-ledger.constants.ts';
import { RestaurantWallet } from '@domain/entities/restaurant-wallet.entity.ts';
import type { RestaurantWalletOverviewData } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import type { RestaurantWallet as PrismaRestaurantWallet } from '@prisma/client';

interface WalletLedgerEntry {
	type: string;
	amountPaise: bigint;
}

type RestaurantWalletOverviewRecord = PrismaRestaurantWallet & {
	ledgerEntries: WalletLedgerEntry[];
};

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
		const settledCreditsPaise = record.ledgerEntries
			.filter((entry) => entry.type === WALLET_LEDGER_TYPES.CREDIT_SETTLEMENT)
			.reduce((total, entry) => total + entry.amountPaise, 0n);
		const withdrawnPaise = record.ledgerEntries
			.filter((entry) => entry.type === WALLET_LEDGER_TYPES.DEBIT_PAYOUT_WITHDRAWAL)
			.reduce((total, entry) => total + entry.amountPaise, 0n);

		return {
			wallet: RestaurantWalletPersistenceMapper.toDomain(record),
			todayStats: {
				settledCreditsPaise,
				withdrawnPaise,
				// The current schema has no payout request state to count pending payouts.
				pendingPayoutsCount: 0,
			},
		};
	},
};
