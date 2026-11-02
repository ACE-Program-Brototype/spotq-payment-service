import type { IGetPlatformFinanceSummaryUseCase } from '@application/ports/use-cases/platform-finance/get-platform-finance-summary.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import { sendSuccessResponse } from '@shared/response/api-response.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';

@injectable()
export class PlatformFinanceController {
	constructor(
		@inject(TYPES.UseCases.GetPlatformFinanceSummaryUseCase)
		private readonly getPlatformFinanceSummaryUseCase: IGetPlatformFinanceSummaryUseCase,
	) {}

	getSummary = async (_req: Request, res: Response): Promise<void> => {
		const result = await this.getPlatformFinanceSummaryUseCase.execute();

		sendSuccessResponse(res, result, MESSAGES.PLATFORM_FINANCE_SUMMARY_FETCHED, HTTP_STATUS.OK);
	};
}
