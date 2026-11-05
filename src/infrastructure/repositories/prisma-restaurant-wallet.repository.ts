import type { RestaurantWallet } from '@domain/entities/restaurant-wallet.entity.ts';
import type {
	IRestaurantWalletRepository,
	RestaurantWalletOverviewData,
} from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import {
	type RestaurantWalletOverviewRecord,
	RestaurantWalletPersistenceMapper,
} from '@infrastructure/mappers/restaurant-wallet.persistence-mapper.ts';
import { Prisma } from '@prisma/client';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaRestaurantWalletRepository
	extends PrismaBaseRepository
	implements IRestaurantWalletRepository
{
	async findById(id: string): Promise<RestaurantWallet | null> {
		const record = await this.prisma.restaurantWallet.findUnique({ where: { id } });
		return record ? RestaurantWalletPersistenceMapper.toDomain(record) : null;
	}

	async findByRestaurantId(restaurantId: string): Promise<RestaurantWallet | null> {
		const record = await this.prisma.restaurantWallet.findUnique({ where: { restaurantId } });
		return record ? RestaurantWalletPersistenceMapper.toDomain(record) : null;
	}

	async create(wallet: RestaurantWallet): Promise<RestaurantWallet> {
		const record = await this.prisma.restaurantWallet.create({
			data: {
				id: wallet.id,
				restaurantId: wallet.restaurantId,
				balancePaise: wallet.balancePaise,
				currency: wallet.currency,
				isLocked: wallet.isLocked,
				razorpayFundAccountId: wallet.razorpayFundAccountId,
				bankName: wallet.bankName,
				bankAccountLast4: wallet.bankAccountLast4,
				createdAt: wallet.createdAt,
				updatedAt: wallet.updatedAt,
			},
		});
		return RestaurantWalletPersistenceMapper.toDomain(record);
	}

	async update(id: string, wallet: RestaurantWallet): Promise<RestaurantWallet> {
		const record = await this.prisma.restaurantWallet.update({
			where: { id },
			data: {
				balancePaise: wallet.balancePaise,
				currency: wallet.currency,
				isLocked: wallet.isLocked,
				razorpayFundAccountId: wallet.razorpayFundAccountId,
				bankName: wallet.bankName,
				bankAccountLast4: wallet.bankAccountLast4,
			},
		});
		return RestaurantWalletPersistenceMapper.toDomain(record);
	}

	async getOverview(restaurantId: string): Promise<RestaurantWalletOverviewData | null> {
		const query = Prisma.sql`
			SELECT
				-- Complete restaurant wallet record
				jsonb_build_object(
					'id', w.id,
					'restaurantId', w.restaurant_id,
					'balancePaise', w.balance_paise,
					'currency', w.currency,
					'isLocked', w.is_locked,
					'razorpayFundAccountId', w.razorpay_fund_account_id,
					'bankName', w.bank_name,
					'bankAccountLast4', w.bank_account_last4,
					'createdAt', w.created_at,
					'updatedAt', w.updated_at
				) AS wallet,

				-- Total customer order payments credited to the wallet today (IST)
				COALESCE(SUM(le.amount_paise) FILTER (
					WHERE le.type = 'CREDIT_ORDER_PAYMENT'
						AND le.created_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata')
											AT TIME ZONE 'Asia/Kolkata'
						AND le.created_at < (date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day')
											AT TIME ZONE 'Asia/Kolkata'
				), 0) AS "todayCreditsPaise",

				-- Lifetime total of successfully processed bank withdrawals
				COALESCE(SUM(le.amount_paise) FILTER (
					WHERE le.type = 'DEBIT_PAYOUT_WITHDRAWAL'
						AND le.status = 'PROCESSED'
				), 0) AS "withdrawnPaise",

				-- Total customer order refunds deducted from the wallet today (IST)
				COALESCE(SUM(le.amount_paise) FILTER (
					WHERE le.type = 'DEBIT_ORDER_REFUND'
						AND le.created_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata')
											AT TIME ZONE 'Asia/Kolkata'
						AND le.created_at < (date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day')
											AT TIME ZONE 'Asia/Kolkata'
				), 0) AS "todayRefundsPaise",

				-- Number of withdrawals currently awaiting bank processing
				COUNT(le.id) FILTER (
					WHERE le.type = 'DEBIT_PAYOUT_WITHDRAWAL'
						AND le.status = 'PROCESSING'
				) AS "pendingPayoutCount"

			FROM restaurant_wallets w

			-- Include all ledger entries belonging to the restaurant wallet
			LEFT JOIN wallet_ledger_entries le ON le.wallet_id = w.id

			-- Fetch only the requested restaurant's wallet
			WHERE w.restaurant_id = ${restaurantId}::uuid

			-- Aggregate ledger metrics into a single wallet overview record
			GROUP BY w.id;
`;
		const walletRecord = await this.prisma.$queryRaw<RestaurantWalletOverviewRecord[]>(query);
		console.log(walletRecord);
		if (!walletRecord) return null;
		return RestaurantWalletPersistenceMapper.toOverview(walletRecord[0]);
	}
}
