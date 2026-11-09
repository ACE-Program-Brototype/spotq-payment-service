import { PrismaSubscriptionAnalyticsRepository } from '../src/infrastructure/repositories/prisma-subscription-analytics.repository.ts';

describe('PrismaSubscriptionAnalyticsRepository (Unit Tests)', () => {
	let repository: PrismaSubscriptionAnalyticsRepository;
	let mockQueryRaw: jest.Mock;

	beforeEach(() => {
		mockQueryRaw = jest.fn();
		repository = new PrismaSubscriptionAnalyticsRepository();
		// @ts-expect-error accessing protected prisma for unit test mocking
		repository.prisma = {
			$queryRaw: mockQueryRaw,
		};
	});

	it('should return aggregated platform subscription analytics when data exists', async () => {
		// Mock responses in sequence for Promise.all:
		// 1. active subscriptions
		// 2. tier distribution
		// 3. revenue comparison
		// 4. bucket queries: revRows, newSubRows, mrrRows for 1 bucket
		mockQueryRaw
			.mockResolvedValueOnce([
				{
					active_subscribed_restaurants: 15,
					current_mrr_paise: 3000000n,
				},
			])
			.mockResolvedValueOnce([
				{ plan_code: 'QUEUE_PRO', restaurant_count: 10 },
				{ plan_code: 'ENTERPRISE', restaurant_count: 5 },
			])
			.mockResolvedValueOnce([
				{
					current_revenue_paise: 4500000n,
					previous_revenue_paise: 3800000n,
				},
			])
			.mockResolvedValueOnce([{ bucket_revenue_paise: 1200000n }])
			.mockResolvedValueOnce([{ new_subscriptions_count: 4 }])
			.mockResolvedValueOnce([{ bucket_mrr_paise: 3000000n }]);

		const result = await repository.getPlatformSubscriptionAnalytics({
			periodStartDate: new Date('2026-11-01T00:00:00Z'),
			nextPeriodStart: new Date('2026-12-01T00:00:00Z'),
			prevStartDate: new Date('2026-10-01T00:00:00Z'),
			billingCycle: 'ALL',
			buckets: [
				{
					bucketLabel: 'Week 1',
					bucketStart: new Date('2026-11-01T00:00:00Z'),
					bucketEnd: new Date('2026-11-08T00:00:00Z'),
				},
			],
		});

		expect(result.activeSubscribedRestaurants).toBe(15);
		expect(result.currentMrrPaise).toBe(3000000n);
		expect(result.currentGrossRevenuePaise).toBe(4500000n);
		expect(result.previousGrossRevenuePaise).toBe(3800000n);
		expect(result.subscriptionTierDistribution).toEqual({
			QUEUE_PRO: 10,
			ENTERPRISE: 5,
		});
		expect(result.timelineBuckets).toHaveLength(1);
		expect(result.timelineBuckets[0]).toEqual({
			bucketLabel: 'Week 1',
			grossRevenuePaise: 1200000n,
			newSubscriptionsCount: 4,
			mrrPaise: 3000000n,
		});
	});

	it('should return safe zeroed defaults when database tables are empty', async () => {
		mockQueryRaw
			.mockResolvedValueOnce([]) // empty active sub row
			.mockResolvedValueOnce([]) // empty tier distribution
			.mockResolvedValueOnce([]) // empty revenue comparison
			.mockResolvedValueOnce([]) // empty bucket rev
			.mockResolvedValueOnce([]) // empty bucket new sub
			.mockResolvedValueOnce([]); // empty bucket mrr

		const result = await repository.getPlatformSubscriptionAnalytics({
			periodStartDate: new Date('2026-11-01T00:00:00Z'),
			nextPeriodStart: new Date('2026-12-01T00:00:00Z'),
			prevStartDate: new Date('2026-10-01T00:00:00Z'),
			billingCycle: 'MONTHLY',
			buckets: [
				{
					bucketLabel: 'Week 1',
					bucketStart: new Date('2026-11-01T00:00:00Z'),
					bucketEnd: new Date('2026-11-08T00:00:00Z'),
				},
			],
		});

		expect(result.activeSubscribedRestaurants).toBe(0);
		expect(result.currentMrrPaise).toBe(0n);
		expect(result.currentGrossRevenuePaise).toBe(0n);
		expect(result.previousGrossRevenuePaise).toBe(0n);
		expect(result.subscriptionTierDistribution).toEqual({});
		expect(result.timelineBuckets[0]).toEqual({
			bucketLabel: 'Week 1',
			grossRevenuePaise: 0n,
			newSubscriptionsCount: 0,
			mrrPaise: 0n,
		});
	});
});
