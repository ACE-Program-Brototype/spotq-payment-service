import type {
	SubscriptionAnalyticsRepoParams,
	SubscriptionAnalyticsRepoResult,
} from '@domain/types/subscription-analytics.types.ts';

export interface ISubscriptionAnalyticsRepository {
	getPlatformSubscriptionAnalytics(
		params: SubscriptionAnalyticsRepoParams,
	): Promise<SubscriptionAnalyticsRepoResult>;
}
