import type { ExportPlatformLedgerInputDTO } from '@application/dtos/platform-finance/export-platform-ledger.dto';

export interface IExportPlatformLedgerUseCase {
	execute(input: ExportPlatformLedgerInputDTO): Promise<string>;
}
