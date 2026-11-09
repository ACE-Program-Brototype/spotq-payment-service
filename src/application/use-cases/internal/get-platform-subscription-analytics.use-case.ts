import type {
	GetPlatformSubscriptionAnalyticsInputDTO,
	PlatformSubscriptionAnalyticsResponseDTO,
} from '@application/dtos/subscription-analytics/platform-subscription-analytics.dto.ts';
import type { IGetPlatformSubscriptionAnalyticsUseCase } from '@application/ports/use-cases/internal/get-platform-subscription-analytics.use-case.port.ts';
import { resolveSubscriptionDateRange } from '@application/utils/subscription-date-range.util.ts';
import { TYPES } from '@di/types.ts';
import type { ISubscriptionAnalyticsRepository } from '@domain/repositories/subscription-analytics.repository.interface.ts';
import { PAISE_PER_RUPEE } from '@shared/constants/analytics.constants.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetPlatformSubscriptionAnalyticsUseCase
	implements IGetPlatformSubscriptionAnalyticsUseCase
{
	constructor(
		@inject(TYPES.Repositories.SubscriptionAnalyticsRepository)
		private readonly analyticsRepository: ISubscriptionAnalyticsRepository,
	) {}

	async execute(
		input: GetPlatformSubscriptionAnalyticsInputDTO,
	): Promise<PlatformSubscriptionAnalyticsResponseDTO> {
		const resolvedRange = resolveSubscriptionDateRange({
			period: input.period,
			day: input.day,
			month: input.month,
			year: input.year,
		});

		const repoResult = await this.analyticsRepository.getPlatformSubscriptionAnalytics({
			periodStartDate: resolvedRange.periodStartDate,
			nextPeriodStart: resolvedRange.nextPeriodStart,
			prevStartDate: resolvedRange.prevStartDate,
			billingCycle: input.billingCycle,
			buckets: resolvedRange.buckets,
		});

		const currentMrrRupees = Number(
			(Number(repoResult.currentMrrPaise) / PAISE_PER_RUPEE).toFixed(2),
		);
		const currentArrRupees = Number((currentMrrRupees * 12).toFixed(2));
		const grossSubscriptionRevenueRupees = Number(
			(Number(repoResult.currentGrossRevenuePaise) / PAISE_PER_RUPEE).toFixed(2),
		);

		const growthPercentage = this.calculateGrowthPercentage(
			repoResult.currentGrossRevenuePaise,
			repoResult.previousGrossRevenuePaise,
		);

		return {
			activeSubscribedRestaurants: repoResult.activeSubscribedRestaurants,
			currentMrrRupees,
			currentArrRupees,
			grossSubscriptionRevenueRupees,
			growthPercentage,
			subscriptionTierDistribution: repoResult.subscriptionTierDistribution,
			timeline: repoResult.timelineBuckets.map((bucket) => ({
				bucketLabel: bucket.bucketLabel,
				grossRevenueRupees: Number((Number(bucket.grossRevenuePaise) / PAISE_PER_RUPEE).toFixed(2)),
				mrrRupees: Number((Number(bucket.mrrPaise) / PAISE_PER_RUPEE).toFixed(2)),
				newSubscriptionsCount: bucket.newSubscriptionsCount,
			})),
			filters: {
				period: resolvedRange.period,
				day: resolvedRange.day,
				month: resolvedRange.month,
				year: resolvedRange.year,
				billingCycle: input.billingCycle,
			},
			generatedAt: new Date().toISOString(),
		};
	}

	private calculateGrowthPercentage(
		currentRevenuePaise: bigint,
		previousRevenuePaise: bigint,
	): number | null {
		const curr = Number(currentRevenuePaise);
		const prev = Number(previousRevenuePaise);

		if (prev === 0) {
			return curr === 0 ? 0 : null;
		}

		if (curr === 0) {
			return -100;
		}

		return Number((((curr - prev) / prev) * 100).toFixed(2));
	}
}
