import type {
	GetPlatformSubscriptionAnalyticsInputDTO,
	PlatformSubscriptionAnalyticsResponseDTO,
} from '@application/dtos/subscription-analytics/platform-subscription-analytics.dto.ts';

export interface IGetPlatformSubscriptionAnalyticsUseCase {
	execute(
		input: GetPlatformSubscriptionAnalyticsInputDTO,
	): Promise<PlatformSubscriptionAnalyticsResponseDTO>;
}

