import { PlatformSubscriptionAnalyticsMapper } from '@application/mappers/subscription-analytics/platform-subscription-analytics.mapper.ts';
import type {
	ResolvedSubscriptionDateRange,
	SubscriptionAnalyticsRepoResult,
} from '@domain/types/subscription-analytics.types.ts';
import { ANALYTICS_PERIODS, BILLING_CYCLES } from '@shared/constants/analytics.constants.ts';
import { paiseToRupees } from '@shared/utils/currency.util.ts';

describe('PlatformSubscriptionAnalyticsMapper', () => {
	describe('paiseToRupees', () => {
		it('should convert paise to rupees with 2 decimal precision', () => {
			expect(paiseToRupees(100000n)).toBe(1000.0);
			expect(paiseToRupees(12345n)).toBe(123.45);
			expect(paiseToRupees(0n)).toBe(0);
			expect(paiseToRupees(99n)).toBe(0.99);
			expect(paiseToRupees(12345)).toBe(123.45);
		});
	});

	describe('calculateGrowthPercentage', () => {
		it('should return correct positive growth percentage', () => {
			expect(
				PlatformSubscriptionAnalyticsMapper.calculateGrowthPercentage(30000000n, 25000000n),
			).toBe(20.0);
		});

		it('should return correct negative growth percentage', () => {
			expect(
				PlatformSubscriptionAnalyticsMapper.calculateGrowthPercentage(10000000n, 20000000n),
			).toBe(-50.0);
		});

		it('should return -100 when current revenue is 0 and previous revenue is positive', () => {
			expect(PlatformSubscriptionAnalyticsMapper.calculateGrowthPercentage(0n, 5000000n)).toBe(
				-100,
			);
		});

		it('should return 0 when both current and previous revenue are 0', () => {
			expect(PlatformSubscriptionAnalyticsMapper.calculateGrowthPercentage(0n, 0n)).toBe(0);
		});

		it('should return null when previous revenue is 0 and current revenue is positive', () => {
			expect(
				PlatformSubscriptionAnalyticsMapper.calculateGrowthPercentage(1000000n, 0n),
			).toBeNull();
		});
	});

	describe('toDTO', () => {
		it('should map repository result and date range into complete response DTO', () => {
			const mockRepoResult: SubscriptionAnalyticsRepoResult = {
				activeSubscribedRestaurants: 8,
				currentMrrPaise: 20000000n,
				currentGrossRevenuePaise: 25000000n,
				previousGrossRevenuePaise: 20000000n,
				subscriptionTierDistribution: { QUEUE_PRO: 5, SELF_PRO: 3 },
				timelineBuckets: [
					{
						bucketLabel: 'Week 1',
						grossRevenuePaise: 10000000n,
						mrrPaise: 10000000n,
						newSubscriptionsCount: 3,
					},
				],
			};

			const mockResolvedRange: ResolvedSubscriptionDateRange = {
				period: ANALYTICS_PERIODS.MONTH,
				day: null,
				month: 11,
				year: 2026,
				periodStartDate: new Date('2026-11-01T00:00:00Z'),
				nextPeriodStart: new Date('2026-12-01T00:00:00Z'),
				prevStartDate: new Date('2026-10-01T00:00:00Z'),
				buckets: [],
			};

			const fixedDate = new Date('2026-11-12T12:00:00.000Z');
			const dto = PlatformSubscriptionAnalyticsMapper.toDTO(
				mockRepoResult,
				mockResolvedRange,
				BILLING_CYCLES.MONTHLY,
				fixedDate,
			);

			expect(dto.activeSubscribedRestaurants).toBe(8);
			expect(dto.currentMrrRupees).toBe(200000);
			expect(dto.currentArrRupees).toBe(2400000); // 200000 * 12
			expect(dto.grossSubscriptionRevenueRupees).toBe(250000);
			expect(dto.growthPercentage).toBe(25.0);
			expect(dto.subscriptionTierDistribution).toEqual({ QUEUE_PRO: 5, SELF_PRO: 3 });
			expect(dto.timeline).toEqual([
				{
					bucketLabel: 'Week 1',
					grossRevenueRupees: 100000,
					mrrRupees: 100000,
					newSubscriptionsCount: 3,
				},
			]);
			expect(dto.filters).toEqual({
				period: ANALYTICS_PERIODS.MONTH,
				day: null,
				month: 11,
				year: 2026,
				billingCycle: BILLING_CYCLES.MONTHLY,
			});
			expect(dto.generatedAt).toBe('2026-11-12T12:00:00.000Z');
		});
	});
});
