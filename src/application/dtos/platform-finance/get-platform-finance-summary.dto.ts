export interface GetPlatformFinanceSummaryOutputDTO {
	currency: string;
	masterBalancePaise: bigint;
	todayTurnoverPaise: bigint;
	tonightEodPayoutQueuePaise: bigint;
	lifetimeDisbursedPaise: bigint;
	totalRefundsProcessedPaise: bigint;
	saasSubscriptionMrrPaise: bigint;
	activeVenuesCount: number;
}
