import type { AnalyticsPeriod, BillingCycle } from '@shared/constants/analytics.constants.ts';

export interface TimelineBucketDefinition {
	bucketLabel: string;
	bucketStart: Date;
	bucketEnd: Date;
}

export interface SubscriptionAnalyticsRepoParams {
	periodStartDate: Date;
	nextPeriodStart: Date;
	prevStartDate: Date;
	billingCycle: BillingCycle;
	buckets: TimelineBucketDefinition[];
}

export interface TimelineBucketResult {
	bucketLabel: string;
	grossRevenuePaise: bigint;
	mrrPaise: bigint;
	newSubscriptionsCount: number;
}

export interface SubscriptionAnalyticsRepoResult {
	activeSubscribedRestaurants: number;
	currentMrrPaise: bigint;
	currentGrossRevenuePaise: bigint;
	previousGrossRevenuePaise: bigint;
	subscriptionTierDistribution: Record<string, number>;
	timelineBuckets: TimelineBucketResult[];
}

export interface SubscriptionDateRangeFilterParams {
	period: AnalyticsPeriod;
	day?: number;
	month?: number;
	year?: number;
}

export interface ResolvedSubscriptionDateRange {
	period: AnalyticsPeriod;
	day: number | null;
	month: number;
	year: number;
	periodStartDate: Date;
	nextPeriodStart: Date;
	prevStartDate: Date;
	buckets: TimelineBucketDefinition[];
}
