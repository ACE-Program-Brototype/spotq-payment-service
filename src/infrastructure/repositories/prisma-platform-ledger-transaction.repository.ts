import type {
	IPlatformLedgerTransactionRepository,
	PlatformLedgerPage,
	PlatformLedgerQuery,
} from '@domain/repositories/platform-ledger-transaction.repository.interface.ts';
import { PlatformLedgerTransactionPersistenceMapper } from '@infrastructure/mappers/platform-ledger-transaction.persistence-mapper.ts';
import type { Prisma } from '@prisma/client';
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
		if (input.type && input.type !== 'ALL') filters.push({ type: input.type });
		if (input.restaurantId) filters.push({ restaurantId: input.restaurantId });
		if (input.startDate || input.endDate) {
			filters.push({
				createdAt: {
					...(input.startDate && { gte: new Date(`${input.startDate}T00:00:00.000Z`) }),
					...(input.endDate && {
						lt: new Date(new Date(`${input.endDate}T00:00:00.000Z`).getTime() + 86_400_000),
					}),
				},
			});
		}
		if (input.search?.trim()) {
			filters.push({
				referenceId: { contains: input.search.trim(), mode: 'insensitive' },
			});
		}

		const where: LedgerWhereInput = filters.length ? { AND: filters } : {};
		const skip = (input.page - 1) * input.limit;
		const [records, totalRecords] = await Promise.all([
			this.prisma.platformLedgerTransaction.findMany({
				where,
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				skip,
				take: input.limit,
			}),
			this.prisma.platformLedgerTransaction.count({ where }),
		]);

		return PlatformLedgerTransactionPersistenceMapper.toPaginatedDomain(
			records,
			totalRecords,
			input.page,
			input.limit,
		);
	}
}
