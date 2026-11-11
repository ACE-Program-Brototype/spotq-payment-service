import type { WalletWithdrawalFailureStatus } from '@domain/constants/wallet-ledger.constants.ts';
import {
	WALLET_LEDGER_STATUSES,
	WALLET_LEDGER_TYPES,
} from '@domain/constants/wallet-ledger.constants.ts';
import type { RestaurantWallet } from '@domain/entities/restaurant-wallet.entity.ts';
import type {
	IRestaurantWalletRepository,
	PaginatedWalletLedgerEntries,
	RestaurantWalletOverviewData,
	WalletLedgerEntriesFilter,
	WalletWithdrawalReservation,
} from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import {
	type RestaurantWalletOverviewRecord,
	RestaurantWalletPersistenceMapper,
} from '@infrastructure/mappers/restaurant-wallet.persistence-mapper.ts';
import { WalletLedgerEntryPersistenceMapper } from '@infrastructure/mappers/wallet-ledger-entry.persistence-mapper.ts';
import { Prisma } from '@prisma/client';
import { MILLISECONDS_PER_DAY } from '@shared/constants/subscription.constants.ts';
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
			data: RestaurantWalletPersistenceMapper.toPersistence(wallet),
		});
		return RestaurantWalletPersistenceMapper.toDomain(record);
	}

	async update(id: string, wallet: RestaurantWallet): Promise<RestaurantWallet> {
		const record = await this.prisma.restaurantWallet.update({
			where: { id },
			data: RestaurantWalletPersistenceMapper.toUpdatePersistence(wallet),
		});
		return RestaurantWalletPersistenceMapper.toDomain(record);
	}

	async getOverview(restaurantId: string): Promise<RestaurantWalletOverviewData | null> {
		const query = Prisma.sql`
			SELECT
				w.id AS "walletId",
				w.restaurant_id AS "walletRestaurantId",
				w.balance_paise AS "walletBalancePaise",
				w.currency AS "walletCurrency",
				w.is_locked AS "walletIsLocked",
				w.razorpay_fund_account_id AS "walletRazorpayFundAccountId",
				w.razorpay_contact_id AS "walletRazorpayContactId",
				w.bank_name AS "walletBankName",
				w.bank_account_last4 AS "walletBankAccountLast4",
				w.created_at AS "walletCreatedAt",
				w.updated_at AS "walletUpdatedAt",

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
					WHERE le.type = ${Prisma.raw(`'${WALLET_LEDGER_TYPES.DEBIT_PAYOUT_WITHDRAWAL}'`)}
						AND le.status = ${Prisma.raw(`'${WALLET_LEDGER_STATUSES.PROCESSING}'`)}
				), 0) AS "pendingWithdrawalsPaise",

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
				) AS "pendingPayoutsCount"

			FROM restaurant_wallets w

			LEFT JOIN wallet_ledger_entries le ON le.wallet_id = w.id

			WHERE w.restaurant_id = ${restaurantId}::uuid

			GROUP BY w.id;
`;
		const walletRecord = await this.prisma.$queryRaw<RestaurantWalletOverviewRecord[]>(query);
		if (walletRecord.length === 0) return null;
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

	async findLedgerEntriesPaginated(
		params: WalletLedgerEntriesFilter,
	): Promise<PaginatedWalletLedgerEntries> {
		const where = {
			wallet: { restaurantId: params.restaurantId },
			...(params.type ? { type: params.type } : {}),
			...(params.status ? { status: params.status } : {}),
			...(params.search?.trim()
				? {
						OR: [
							{ referenceId: { contains: params.search.trim(), mode: 'insensitive' as const } },
							{ utrNumber: { contains: params.search.trim(), mode: 'insensitive' as const } },
						],
					}
				: {}),
			...(params.startDate || params.endDate
				? {
						createdAt: {
							...(params.startDate ? { gte: new Date(`${params.startDate}T00:00:00.000Z`) } : {}),
							...(params.endDate
								? {
										lt: new Date(
											new Date(`${params.endDate}T00:00:00.000Z`).getTime() + MILLISECONDS_PER_DAY,
										),
									}
								: {}),
						},
					}
				: {}),
		};

		const [records, totalRecords] = await Promise.all([
			this.prisma.walletLedgerEntry.findMany({
				where,
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				skip: (params.page - 1) * params.limit,
				take: params.limit,
			}),
			this.prisma.walletLedgerEntry.count({ where }),
		]);

		return {
			entries: records.map(WalletLedgerEntryPersistenceMapper.toDomain),
			totalRecords,
		};
	}

	async reserveWithdrawal(
		walletId: string,
		amountPaise: bigint,
		reference: string,
	): Promise<WalletWithdrawalReservation> {
		return this.prisma.$transaction(
			async (transaction) => {
				const wallet = await transaction.restaurantWallet.update({
					where: { id: walletId },
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
