import type { ExportPlatfromLedgerInputDTO } from '@application/dtos/platform-finance/export-platform-ledger.dto';
import type { IExportPlatformLedgerUseCase } from '@application/ports/use-cases/platform-finance/export-platform-ledger.use-case.port';
import { TYPES } from '@di/types';
import type { IPlatformLedgerTransactionRepository } from '@domain/repositories/platform-ledger-transaction.repository.interface';
import { CSV_QUOTE_REGEX } from '@shared/constants/regex.constants.ts';
import { inject, injectable } from 'inversify';

const columns = [
	'id',
	'type',
	'amountPaise',
	'runningBalancePaise',
	'restaurantId',
	'referenceId',
	'createdAt',
] as const;
const csvCell = (value: string | null): string =>
	`"${(value ?? '').replace(CSV_QUOTE_REGEX, '""')}"`;

@injectable()
export class ExportPlatformLedgerUseCase implements IExportPlatformLedgerUseCase {
	constructor(
		@inject(TYPES.Repositories.PlatformLedgerTransactionRepository)
		private readonly repository: IPlatformLedgerTransactionRepository,
	) {}

	async execute(input: ExportPlatfromLedgerInputDTO): Promise<string> {
		const result = await this.repository.findManyPaginated(input);

		const rows = result.entries.map((entry) => ({
			id: entry.id,
			type: entry.type,
			amountPaise: entry.amountPaise.toString(),
			runningBalancePaise: entry.runningBalancePaise.toString(),
			restaurantId: entry.restaurantId,
			referenceId: entry.referenceId,
			createdAt: entry.createdAt.toISOString(),
		}));

		return [
			['page', csvCell(result.pagination.page.toString())].join(','),
			['limit', csvCell(result.pagination.limit.toString())].join(','),
			['totalPages', csvCell(result.pagination.totalPages.toString())].join(','),
			'',
			columns.join(','),
			...rows.map((row) => columns.map((key) => csvCell(row[key])).join(',')),
		].join('\r\n');
	}
}
