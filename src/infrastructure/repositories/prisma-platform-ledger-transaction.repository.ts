import type {
	IPlatformLedgerTransactionRepository,
	PlatformLedgerPage,
	PlatformLedgerQuery,
} from '@domain/repositories/platform-ledger-transaction.repository.interface.ts';
import { PlatformLedgerTransactionPersistenceMapper } from '@infrastructure/mappers/platform-ledger-transaction.persistence-mapper.ts';
import type { Prisma } from '@prisma/client';
import {
	INDIA_TIMEZONE_OFFSET_MS,
	MILLISECONDS_PER_DAY,
} from '@shared/constants/subscription.constants.ts';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaPlatformLedgerTransactionRepository
	extends PrismaBaseRepository
	implements IPlatformLedgerTransactionRepository
{
	async findManyPaginated(input: PlatformLedgerQuery): Promise<PlatformLedgerPage> {
		type LedgerWhereInput = Prisma.Args<
			typeof this.prisma.platformLedgerTransaction,
			'findMany'
		>['where'];

		const filters: NonNullable<LedgerWhereInput>[] = [];
		if (input.type) filters.push({ type: input.type });
		if (input.restaurantId) filters.push({ restaurantId: input.restaurantId });
		if (input.startDate || input.endDate) {
			// Interpret date filters as Asia/Kolkata calendar days (UTC+05:30).
			filters.push({
				createdAt: {
					...(input.startDate && {
						gte: new Date(
							new Date(`${input.startDate}T00:00:00.000Z`).getTime() - INDIA_TIMEZONE_OFFSET_MS,
						),
					}),
					...(input.endDate && {
						lt: new Date(
							new Date(`${input.endDate}T00:00:00.000Z`).getTime() +
								MILLISECONDS_PER_DAY -
								INDIA_TIMEZONE_OFFSET_MS,
						),
					}),
				},
			});
		}
		if (input.search?.trim()) {
			filters.push({
				referenceId: { startsWith: input.search.trim() },
			});
		}

		const where: LedgerWhereInput = filters.length ? { AND: filters } : {};
		const pagination = {
			...(input.limit !== undefined && { take: input.limit }),
			...(input.page !== undefined &&
				input.limit !== undefined && {
					skip: (input.page - 1) * input.limit,
				}),
		};
		const [records, totalRecords] = await this.executePrisma(() =>
			Promise.all([
				this.prisma.platformLedgerTransaction.findMany({
					where,
					orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
					...pagination,
				}),
				this.prisma.platformLedgerTransaction.count({ where }),
			]),
		);

		return PlatformLedgerTransactionPersistenceMapper.toPaginatedDomain(
			records,
			totalRecords,
			input.page,
			input.limit,
		);
	}
}
