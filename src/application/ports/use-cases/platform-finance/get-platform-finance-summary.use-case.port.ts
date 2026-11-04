import type { GetPlatformFinanceSummaryOutputDTO } from '@application/dtos/platform-finance/get-platform-finance-summary.dto';

export interface IGetPlatformFinanceSummaryUseCase {
	execute(): Promise<GetPlatformFinanceSummaryOutputDTO>;
}
