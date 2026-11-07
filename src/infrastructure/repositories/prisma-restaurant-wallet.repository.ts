import type { WalletWithdrawalFailureStatus } from '@domain/constants/wallet-ledger.constants.ts';
import {
	WALLET_LEDGER_STATUSES,
	WALLET_LEDGER_TYPES,
} from '@domain/constants/wallet-ledger.constants.ts';
import type { RestaurantWallet } from '@domain/entities/restaurant-wallet.entity.ts';
import type {
	IRestaurantWalletRepository,
	RestaurantWalletOverviewData,
	WalletWithdrawalReservation,
} from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import {
	type RestaurantWalletOverviewRecord,
	RestaurantWalletPersistenceMapper,
} from '@infrastructure/mappers/restaurant-wallet.persistence-mapper.ts';
import { WalletLedgerEntryPersistenceMapper } from '@infrastructure/mappers/wallet-ledger-entry.persistence-mapper.ts';
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
			data: RestaurantWalletPersistenceMapper.toPersistance(wallet),
		});
		return RestaurantWalletPersistenceMapper.toDomain(record);
	}

	async update(id: string, wallet: RestaurantWallet): Promise<RestaurantWallet> {
		const record = await this.prisma.restaurantWallet.update({
			where: { id },
			data: RestaurantWalletPersistenceMapper.toUpdatePersistance(wallet),
		});
		return RestaurantWalletPersistenceMapper.toDomain(record);
	}

	async getOverview(restaurantId: string): Promise<RestaurantWalletOverviewData | null> {
		const query = Prisma.sql`
			SELECT
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

				COALESCE(SUM(le.amount_paise) FILTER (
					WHERE le.type = ${Prisma.raw(`'${WALLET_LEDGER_TYPES.CREDIT_ORDER_PAYMENT}'`)}
						AND le.created_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata')
											AT TIME ZONE 'Asia/Kolkata'
						AND le.created_at < (date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day')
											AT TIME ZONE 'Asia/Kolkata'
				), 0) AS "todayCreditsPaise",

				COALESCE(SUM(le.amount_paise) FILTER (
					WHERE le.type = ${Prisma.raw(`'${WALLET_LEDGER_TYPES.DEBIT_PAYOUT_WITHDRAWAL}'`)}
						AND le.status = ${Prisma.raw(`'${WALLET_LEDGER_STATUSES.PROCESSED}'`)}
				), 0) AS "withdrawnPaise",

				COALESCE(SUM(le.amount_paise) FILTER (
					WHERE le.type = ${Prisma.raw(`'${WALLET_LEDGER_TYPES.DEBIT_ORDER_REFUND}'`)}
						AND le.created_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata')
											AT TIME ZONE 'Asia/Kolkata'
						AND le.created_at < (date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day')
											AT TIME ZONE 'Asia/Kolkata'
				), 0) AS "todayRefundsPaise",

				COUNT(le.id) FILTER (
					WHERE le.type = ${Prisma.raw(`'${WALLET_LEDGER_TYPES.DEBIT_PAYOUT_WITHDRAWAL}'`)}
						AND le.status = ${Prisma.raw(`'${WALLET_LEDGER_STATUSES.PROCESSING}'`)}
				) AS "pendingPayoutCount"

			FROM restaurant_wallets w

			LEFT JOIN wallet_ledger_entries le ON le.wallet_id = w.id

			WHERE w.restaurant_id = ${restaurantId}::uuid

			GROUP BY w.id;
`;
		const walletRecord = await this.prisma.$queryRaw<RestaurantWalletOverviewRecord[]>(query);
		if (!walletRecord) return null;
		return RestaurantWalletPersistenceMapper.toOverview(walletRecord[0]);
	}

	async getTodayNetEarningsPaise(
		restaurantId: string,
		businessDayStart: Date,
		nextBusinessDayStart: Date,
	): Promise<bigint> {
		const entries = await this.prisma.walletLedgerEntry.groupBy({
			by: ['type'],
			where: {
				wallet: { restaurantId },
				createdAt: { gte: businessDayStart, lt: nextBusinessDayStart },
				type: {
					in: [WALLET_LEDGER_TYPES.CREDIT_ORDER_PAYMENT, WALLET_LEDGER_TYPES.DEBIT_ORDER_REFUND],
				},
			},
			_sum: { amountPaise: true },
		});
		const credits =
			entries.find((entry) => entry.type === WALLET_LEDGER_TYPES.CREDIT_ORDER_PAYMENT)?._sum
				.amountPaise ?? 0n;
		const refunds =
			entries.find((entry) => entry.type === WALLET_LEDGER_TYPES.DEBIT_ORDER_REFUND)?._sum
				.amountPaise ?? 0n;
		return credits - refunds;
	}
	async reserveWithdrawal(
		restaurantId: string,
		amountPaise: bigint,
		reference: string,
	): Promise<WalletWithdrawalReservation> {
		return this.prisma.$transaction(
			async (transaction) => {
				const wallet = await transaction.restaurantWallet.update({
					where: {
						restaurantId,
						balancePaise: { gte: amountPaise },
						isLocked: false,
						razorpayFundAccountId: { not: null },
					},
					data: {
						balancePaise: { decrement: amountPaise },
					},
				});

				const ledger = await transaction.walletLedgerEntry.create({
					data: {
						walletId: wallet.id,
						type: WALLET_LEDGER_TYPES.DEBIT_PAYOUT_WITHDRAWAL,
						status: WALLET_LEDGER_STATUSES.PROCESSING,
						amountPaise,
						balanceBefore: wallet.balancePaise + amountPaise,
						balanceAfter: wallet.balancePaise,
						referenceId: reference,
					},
				});
				const walletLedgerEntry = WalletLedgerEntryPersistenceMapper.toDomain(ledger);

				return {
					withdrawalReference: walletLedgerEntry.referenceId ?? reference,
					withdrawnPaise: walletLedgerEntry.amountPaise,
					remainingBalancePaise: wallet.balancePaise,
					createdAt: walletLedgerEntry.createdAt,
					bankName: wallet?.bankName ?? '',
					bankAccountLast4: wallet.bankAccountLast4 ?? '',
					fundAccountId: wallet.razorpayFundAccountId ?? '',
				};
			},
			{
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			},
		);
	}

	// TODO : NOT CHECKED
	async failWithdrawal(
		reference: string,
		status: WalletWithdrawalFailureStatus = WALLET_LEDGER_STATUSES.FAILED,
	): Promise<void> {
		await this.prisma.$transaction(async (transaction) => {
			// Failed payouts are only released while pending; a reversal may arrive after processing.
			const isEligibleStatus = (entryStatus: string): boolean => {
				if (entryStatus === WALLET_LEDGER_STATUSES.PROCESSING) return true;
				if (status === WALLET_LEDGER_STATUSES.REVERSED) {
					return entryStatus === WALLET_LEDGER_STATUSES.PROCESSED;
				}
				return false;
			};

			const entry = await transaction.walletLedgerEntry.findUnique({
				where: { referenceId: reference },
			});

			if (
				!entry ||
				entry.type !== WALLET_LEDGER_TYPES.DEBIT_PAYOUT_WITHDRAWAL ||
				!isEligibleStatus(entry.status)
			) {
				return;
			}

			await transaction.$queryRaw`
			-- Serialize wallet balance changes while applying the release.
			SELECT id
			FROM restaurant_wallets
			WHERE id = ${entry.walletId}::uuid
			FOR UPDATE
		`;

			const lockedEntry = await transaction.walletLedgerEntry.findUnique({
				where: { id: entry.id },
			});

			if (!lockedEntry || !isEligibleStatus(lockedEntry.status)) return;

			const wallet = await transaction.restaurantWallet.update({
				where: { id: entry.walletId },
				data: {
					balancePaise: { increment: lockedEntry.amountPaise },
				},
			});

			await transaction.walletLedgerEntry.create({
				data: {
					walletId: wallet.id,
					type: WALLET_LEDGER_TYPES.CREDIT_PAYOUT_REVERSAL,
					status: WALLET_LEDGER_STATUSES.PROCESSED,
					amountPaise: lockedEntry.amountPaise,
					balanceBefore: wallet.balancePaise - lockedEntry.amountPaise,
					balanceAfter: wallet.balancePaise,
					referenceId: `${reference}:reversal`,
				},
			});

			await transaction.walletLedgerEntry.update({
				where: { id: lockedEntry.id },
				data: { status },
			});
		});
	}

	async markWithdrawalProcessed(reference: string, utrNumber?: string | null): Promise<void> {
		await this.prisma.$transaction(async (transaction) => {
			const entry = await transaction.walletLedgerEntry.findUnique({
				where: { referenceId: reference },
			});
			if (
				!entry ||
				entry.type !== WALLET_LEDGER_TYPES.DEBIT_PAYOUT_WITHDRAWAL ||
				entry.status !== WALLET_LEDGER_STATUSES.PROCESSING
			) {
				return;
			}

			await transaction.$queryRaw`
				SELECT id FROM restaurant_wallets WHERE id = ${entry.walletId}::uuid FOR UPDATE
			`;
			const lockedEntry = await transaction.walletLedgerEntry.findUnique({
				where: { id: entry.id },
			});
			if (!lockedEntry || lockedEntry.status !== WALLET_LEDGER_STATUSES.PROCESSING) return;

			await transaction.walletLedgerEntry.update({
				where: { id: lockedEntry.id },
				data: {
					status: WALLET_LEDGER_STATUSES.PROCESSED,
					utrNumber: utrNumber ?? undefined,
				},
			});
		});
	}
}
