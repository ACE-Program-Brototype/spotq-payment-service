import type { ExportPlatfromLedgerInputDTO } from '@application/dtos/platform-finance/export-platform-ledger.dto';

export interface IExportPlatformLedgerUseCase {
	execute(input: ExportPlatfromLedgerInputDTO): Promise<string>;
}
