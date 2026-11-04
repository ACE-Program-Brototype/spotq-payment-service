export interface GetPlatformFinanceSummaryOutputDTO {
	currency: string;
	masterBalancePaise: string;
	todayTurnoverPaise: string;
	tonightEodPayoutQueuePaise: string;
	lifetimeDisbursedPaise: string;
	totalRefundsProcessedPaise: string;
	saasSubscriptionMrrPaise: string;
	activeVenuesCount: number;
}
