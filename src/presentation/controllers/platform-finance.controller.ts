import type { IExportPlatformLedgerUseCase } from '@application/ports/use-cases/platform-finance/export-platform-ledger.use-case.port.ts';
import type { IGetPlatformFinanceSummaryUseCase } from '@application/ports/use-cases/platform-finance/get-platform-finance-summary.use-case.port.ts';
import type { IGetPlatformMasterLedgerUseCase } from '@application/ports/use-cases/platform-finance/get-platform-master-ledger.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import { sendSuccessResponse } from '@shared/response/api-response.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type { GetPlatformMasterLedgerQuery } from '../validators/platform-finance/get-platform-master-ledger.validtor.ts';

@injectable()
export class PlatformFinanceController {
	constructor(
		@inject(TYPES.UseCases.GetPlatformFinanceSummaryUseCase)
		private readonly getPlatformFinanceSummaryUseCase: IGetPlatformFinanceSummaryUseCase,
		@inject(TYPES.UseCases.GetPlatformMasterLedgerUseCase)
		private readonly getPlatformMasterLedgerUseCase: IGetPlatformMasterLedgerUseCase,
		@inject(TYPES.UseCases.ExportPlatformLedgerUseCase)
		private readonly exportPlatformLedgerUseCase: IExportPlatformLedgerUseCase,
	) {}

	getSummary = async (_req: Request, res: Response): Promise<void> => {
		const result = await this.getPlatformFinanceSummaryUseCase.execute();

		sendSuccessResponse(res, result, MESSAGES.PLATFORM_FINANCE_SUMMARY_FETCHED, HTTP_STATUS.OK);
	};

	getLedger = async (req: Request, res: Response): Promise<void> => {
		const input = req.query as unknown as GetPlatformMasterLedgerQuery;
		const result = await this.getPlatformMasterLedgerUseCase.execute(input);

		sendSuccessResponse(res, result, MESSAGES.PLATFORM_MASTER_LEDGER_FETCHED, HTTP_STATUS.OK);
	};

	exportLedgerCsv = async (req: Request, res: Response): Promise<void> => {
		const input = req.query as unknown as GetPlatformMasterLedgerQuery;
		const csv = await this.exportPlatformLedgerUseCase.execute(input);
		const timestamp = new Date().toISOString();
		res.type('text/csv; charset=utf-8');
		res.setHeader('Content-Disposition', `attachment; filename="platform-ledger-${timestamp}.csv"`);
		res.send(`\uFEFF${csv}`);
	};
}
