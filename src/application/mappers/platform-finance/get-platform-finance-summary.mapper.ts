import type { GetPlatformFinanceSummaryOutputDTO } from '@application/dtos/platform-finance/get-platform-finance-summary.dto';
import type { PlatformFinanceSummaryReadModel } from '@domain/repositories/finance-query.repository.interface';

export const GetPlatformFinanceSummaryMapper = {
	toDto(query: PlatformFinanceSummaryReadModel): GetPlatformFinanceSummaryOutputDTO {
		return {
			currency: query.currency,
			masterBalancePaise: query.masterBalancePaise,
			todayTurnoverPaise: query.todayTurnoverPaise,
			tonightEodPayoutQueuePaise: query.tonightEodPayoutQueuePaise,
			lifetimeDisbursedPaise: query.lifetimeDisbursedPaise,
			totalRefundsProcessedPaise: query.totalRefundsProcessedPaise,
			saasSubscriptionMrrPaise: query.saasSubscriptionMrrPaise,
			activeVenuesCount: query.activeVenuesCount,
		};
	},
};
