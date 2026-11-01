import type { GetPlatformFinanceSummaryOutputDTO } from '@application/dtos/platform-finance/get-platform-finance-summary.dto';
import type { IGetPlatformFinanceSummaryUseCase } from '@application/ports/use-cases/platform-finance/get-platform-finance-summary.use-case.port';
import { TYPES } from '@di/types';
import type { IFinanceQueryRepository } from '@domain/repositories/finance-query.repository.interface';
import { inject } from 'inversify';

export class GetPlatformFinanceSummaryUseCase implements IGetPlatformFinanceSummaryUseCase {
	constructor(
		@inject(TYPES.Repositories.FinanceQueryRepository)
		private readonly financeQueryRepository: IFinanceQueryRepository,
	) {}

	async execute(): Promise<GetPlatformFinanceSummaryOutputDTO> {
		const data = await this.financeQueryRepository.getPlatformSummary();
		return data;
	}
}
