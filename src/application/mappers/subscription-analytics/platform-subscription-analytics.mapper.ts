import type {
	PlatformSubscriptionAnalyticsResponseDTO,
	SubscriptionTimelineBucketDTO,
} from '@application/dtos/subscription-analytics/platform-subscription-analytics.dto.ts';
import type {
	ResolvedSubscriptionDateRange,
	SubscriptionAnalyticsRepoResult,
} from '@domain/types/subscription-analytics.types.ts';
import {
	type BillingCycle,
	DECIMAL_PRECISION,
	MONTHS_IN_A_YEAR,
} from '@shared/constants/analytics.constants.ts';
import { paiseToRupees } from '@shared/utils/currency.util.ts';

export const PlatformSubscriptionAnalyticsMapper = {
	toDTO(
		repoResult: SubscriptionAnalyticsRepoResult,
		resolvedRange: ResolvedSubscriptionDateRange,
		billingCycle: BillingCycle,
		generatedAt: Date = new Date(),
	): PlatformSubscriptionAnalyticsResponseDTO {
		const currentMrrRupees = paiseToRupees(repoResult.currentMrrPaise);
		const currentArrRupees = Number(
			(currentMrrRupees * MONTHS_IN_A_YEAR).toFixed(DECIMAL_PRECISION.CURRENCY),
		);
		const grossSubscriptionRevenueRupees = paiseToRupees(repoResult.currentGrossRevenuePaise);

		const growthPercentage = PlatformSubscriptionAnalyticsMapper.calculateGrowthPercentage(
			repoResult.currentGrossRevenuePaise,
			repoResult.previousGrossRevenuePaise,
		);

		const timeline: SubscriptionTimelineBucketDTO[] = repoResult.timelineBuckets.map((bucket) => ({
			bucketLabel: bucket.bucketLabel,
			grossRevenueRupees: paiseToRupees(bucket.grossRevenuePaise),
			mrrRupees: paiseToRupees(bucket.mrrPaise),
			newSubscriptionsCount: bucket.newSubscriptionsCount,
		}));

		return {
			activeSubscribedRestaurants: repoResult.activeSubscribedRestaurants,
			currentMrrRupees,
			currentArrRupees,
			grossSubscriptionRevenueRupees,
			growthPercentage,
			subscriptionTierDistribution: repoResult.subscriptionTierDistribution,
			timeline,
			filters: {
				period: resolvedRange.period,
				day: resolvedRange.day,
				month: resolvedRange.month,
				year: resolvedRange.year,
				billingCycle,
			},
			generatedAt: generatedAt.toISOString(),
		};
	},

	calculateGrowthPercentage(
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

		return Number((((curr - prev) / prev) * 100).toFixed(DECIMAL_PRECISION.PERCENTAGE));
	},
};
