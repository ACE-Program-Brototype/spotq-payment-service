import type { ExportPlatformLedgerInputDTO } from '@application/dtos/platform-finance/export-platform-ledger.dto';
import { PlatformLedgerEntryMapper } from '@application/mappers/platform-finance/platform-ledger-entry.mapper';
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

	async execute(input: ExportPlatformLedgerInputDTO): Promise<string> {
		const result = await this.repository.findManyPaginated({
			search: input.search,
			type: input.type,
			restaurantId: input.restaurantId,
			startDate: input.startDate,
			endDate: input.endDate,
		});

		const rows = result.entries.map(PlatformLedgerEntryMapper.toDto);

		return [
			columns.join(','),
			...rows.map((row) => columns.map((key) => csvCell(row[key])).join(',')),
		].join('\r\n');
	}
}
