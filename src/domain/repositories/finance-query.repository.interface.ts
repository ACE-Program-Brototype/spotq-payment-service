export interface PlatformFinanceSummaryReadModel {
	currency: string;
	masterBalancePaise: bigint;
	todayTurnoverPaise: bigint;
	tonightEodPayoutQueuePaise: bigint;
	lifetimeDisbursedPaise: bigint;
	totalRefundsProcessedPaise: bigint;
	saasSubscriptionMrrPaise: bigint;
	activeVenuesCount: number;
}

export interface IFinanceQueryRepository {
	getPlatformSummary(): Promise<PlatformFinanceSummaryReadModel>;
}
