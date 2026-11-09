import type { AnalyticsPeriod, BillingCycle } from '@shared/constants/analytics.constants.ts';

export interface GetPlatformSubscriptionAnalyticsInputDTO {
	period: AnalyticsPeriod;
	day?: number;
	month?: number;
	year?: number;
	billingCycle: BillingCycle;
}

export interface SubscriptionTimelineBucketDTO {
	bucketLabel: string;
	grossRevenueRupees: number;
	mrrRupees: number;
	newSubscriptionsCount: number;
}

export interface PlatformSubscriptionAnalyticsResponseDTO {
	activeSubscribedRestaurants: number;
	currentMrrRupees: number;
	currentArrRupees: number;
	grossSubscriptionRevenueRupees: number;
	growthPercentage: number | null;
	subscriptionTierDistribution: Record<string, number>;
	timeline: SubscriptionTimelineBucketDTO[];
	filters: {
		period: AnalyticsPeriod;
		day: number | null;
		month: number;
		year: number;
		billingCycle: BillingCycle;
	};
	generatedAt: string;
}

