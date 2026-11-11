import { GetPlatformSubscriptionAnalyticsUseCase } from '@application/use-cases/internal/get-platform-subscription-analytics.use-case.ts';
import type { ISubscriptionAnalyticsRepository } from '@domain/repositories/subscription-analytics.repository.interface.ts';
import type { SubscriptionAnalyticsRepoResult } from '@domain/types/subscription-analytics.types.ts';
import { ANALYTICS_PERIODS, BILLING_CYCLES } from '@shared/constants/analytics.constants.ts';

describe('GetPlatformSubscriptionAnalyticsUseCase', () => {
	let mockRepo: jest.Mocked<ISubscriptionAnalyticsRepository>;
	let useCase: GetPlatformSubscriptionAnalyticsUseCase;

	const mockRepoResult: SubscriptionAnalyticsRepoResult = {
		activeSubscribedRestaurants: 10,
		currentMrrPaise: 24500000n, // ₹245,000
		currentGrossRevenuePaise: 30000000n, // ₹300,000
		previousGrossRevenuePaise: 25000000n, // ₹250,000 -> +20% growth
		subscriptionTierDistribution: {
			QUEUE_PRO: 7,
			ENTERPRISE: 3,
		},
		timelineBuckets: [
			{
				bucketLabel: 'Week 1',
				grossRevenuePaise: 5800000n,
				mrrPaise: 5800000n,
				newSubscriptionsCount: 2,
			},
			{
				bucketLabel: 'Week 2',
				grossRevenuePaise: 6100000n,
				mrrPaise: 6100000n,
				newSubscriptionsCount: 3,
			},
		],
	};

	beforeEach(() => {
		mockRepo = {
			getPlatformSubscriptionAnalytics: jest.fn().mockResolvedValue(mockRepoResult),
		};
		useCase = new GetPlatformSubscriptionAnalyticsUseCase(mockRepo);
	});

	it('should calculate metrics and normalise amounts to Rupees', async () => {
		const result = await useCase.execute({
			period: ANALYTICS_PERIODS.MONTH,
			month: 11,
			year: 2026,
			billingCycle: BILLING_CYCLES.ALL,
		});

		expect(result.activeSubscribedRestaurants).toBe(10);
		expect(result.currentMrrRupees).toBe(245000);
		expect(result.currentArrRupees).toBe(2940000); // 245000 * 12
		expect(result.grossSubscriptionRevenueRupees).toBe(300000);
		expect(result.growthPercentage).toBe(20.0);
		expect(result.subscriptionTierDistribution).toEqual({
			QUEUE_PRO: 7,
			ENTERPRISE: 3,
		});
		expect(result.timeline).toHaveLength(2);
		expect(result.timeline[0]).toEqual({
			bucketLabel: 'Week 1',
			grossRevenueRupees: 58000,
			mrrRupees: 58000,
			newSubscriptionsCount: 2,
		});
		expect(result.filters).toEqual({
			period: ANALYTICS_PERIODS.MONTH,
			day: null,
			month: 11,
			year: 2026,
			billingCycle: BILLING_CYCLES.ALL,
		});
		expect(result.generatedAt).toBeDefined();
	});

	it('should return null growth percentage when previous period revenue is zero and current is positive', async () => {
		mockRepo.getPlatformSubscriptionAnalytics.mockResolvedValueOnce({
			...mockRepoResult,
			previousGrossRevenuePaise: 0n,
			currentGrossRevenuePaise: 5000000n,
		});

		const result = await useCase.execute({
			period: ANALYTICS_PERIODS.MONTH,
			month: 11,
			year: 2026,
			billingCycle: BILLING_CYCLES.ALL,
		});

		expect(result.growthPercentage).toBeNull();
	});

	it('should return 0 growth percentage when both previous and current revenue are zero', async () => {
		mockRepo.getPlatformSubscriptionAnalytics.mockResolvedValueOnce({
			...mockRepoResult,
			previousGrossRevenuePaise: 0n,
			currentGrossRevenuePaise: 0n,
		});

		const result = await useCase.execute({
			period: ANALYTICS_PERIODS.MONTH,
			month: 11,
			year: 2026,
			billingCycle: BILLING_CYCLES.ALL,
		});

		expect(result.growthPercentage).toBe(0);
	});

	it('should return -100 growth percentage when previous revenue was positive and current is zero', async () => {
		mockRepo.getPlatformSubscriptionAnalytics.mockResolvedValueOnce({
			...mockRepoResult,
			previousGrossRevenuePaise: 1000000n,
			currentGrossRevenuePaise: 0n,
		});

		const result = await useCase.execute({
			period: ANALYTICS_PERIODS.MONTH,
			month: 11,
			year: 2026,
			billingCycle: BILLING_CYCLES.ALL,
		});

		expect(result.growthPercentage).toBe(-100);
	});
});
