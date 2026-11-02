import type { GetPlatformFinanceSummaryOutputDTO } from '@application/dtos/platform-finance/get-platform-finance-summary.dto';
import type { PlatformFinanceSummaryReadModel } from '@domain/repositories/finance-query.repository.interface';

export const GetPlatformFinanceSummaryMapper = {
	toDto(query: PlatformFinanceSummaryReadModel): GetPlatformFinanceSummaryOutputDTO {
		return {
			currency: query.currency,
			masterBalancePaise: query.masterBalancePaise.toString(),
			todayTurnoverPaise: query.todayTurnoverPaise.toString(),
			tonightEodPayoutQueuePaise: query.tonightEodPayoutQueuePaise.toString(),
			lifetimeDisbursedPaise: query.lifetimeDisbursedPaise.toString(),
			totalRefundsProcessedPaise: query.totalRefundsProcessedPaise.toString(),
			saasSubscriptionMrrPaise: query.saasSubscriptionMrrPaise.toString(),
			activeVenuesCount: query.activeVenuesCount,
		};
	},
};
