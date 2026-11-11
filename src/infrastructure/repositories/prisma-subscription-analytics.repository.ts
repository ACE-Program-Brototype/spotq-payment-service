import type { ISubscriptionAnalyticsRepository } from '@domain/repositories/subscription-analytics.repository.interface.ts';
import type {
	SubscriptionAnalyticsRepoParams,
	SubscriptionAnalyticsRepoResult,
	TimelineBucketResult,
} from '@domain/types/subscription-analytics.types.ts';
import { PrismaBaseRepository } from '@infrastructure/repositories/prisma-base.repository.ts';
import {
	BILLING_CYCLES,
	TIMELINE_BUCKET_BATCH_SIZE,
} from '@shared/constants/analytics.constants.ts';
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS } from '@shared/constants/subscription.constants.ts';
import { injectable } from 'inversify';

interface ActiveSubscriptionAggregateRow {
	active_subscribed_restaurants: number;
	current_mrr_paise: bigint;
}

interface TierDistributionRow {
	plan_code: string;
	restaurant_count: number;
}

interface RevenueComparisonRow {
	current_revenue_paise: bigint;
	previous_revenue_paise: bigint;
}

interface BucketRevenueRow {
	bucket_revenue_paise: bigint;
}

interface BucketNewSubRow {
	new_subscriptions_count: number;
}

interface BucketMrrRow {
	bucket_mrr_paise: bigint;
}

@injectable()
export class PrismaSubscriptionAnalyticsRepository
	extends PrismaBaseRepository
	implements ISubscriptionAnalyticsRepository
{
	async getPlatformSubscriptionAnalytics(
		params: SubscriptionAnalyticsRepoParams,
	): Promise<SubscriptionAnalyticsRepoResult> {
		const billingCycleFilter = params.billingCycle;

		const [activeSubResult, tierDistributionResult, revenueResult, timelineBuckets] =
			await Promise.all([
				// 1. Top-level Active Subscribed Restaurants & Current MRR
				this.prisma.$queryRaw<ActiveSubscriptionAggregateRow[]>`
					SELECT
						COUNT(DISTINCT s."restaurant_id")::int AS active_subscribed_restaurants,
						COALESCE(SUM(
							CASE
								WHEN p."billing_cycle"::text = ${BILLING_CYCLES.MONTHLY} THEN p."price_paise"
								WHEN p."billing_cycle"::text = ${BILLING_CYCLES.YEARLY} THEN ROUND(p."price_paise" / 12.0)
								ELSE 0
							END
						), 0)::bigint AS current_mrr_paise
					FROM "subscriptions" s
					JOIN "subscription_plans" p ON s."plan_id" = p."id"
					WHERE s."status"::text = ${SUBSCRIPTION_STATUS.ACTIVE}
						AND s."current_period_end" >= NOW()
						AND (${billingCycleFilter} = ${BILLING_CYCLES.ALL} OR p."billing_cycle"::text = ${billingCycleFilter})
				`,

				// 2. Subscription Tier Distribution
				this.prisma.$queryRaw<TierDistributionRow[]>`
					SELECT
						p."code" AS plan_code,
						COUNT(DISTINCT s."restaurant_id")::int AS restaurant_count
					FROM "subscriptions" s
					JOIN "subscription_plans" p ON s."plan_id" = p."id"
					WHERE s."status"::text = ${SUBSCRIPTION_STATUS.ACTIVE}
						AND s."current_period_end" >= NOW()
						AND (${billingCycleFilter} = ${BILLING_CYCLES.ALL} OR p."billing_cycle"::text = ${billingCycleFilter})
					GROUP BY p."code"
				`,

				// 3. Current & Previous Period Gross Subscription Revenue
				this.prisma.$queryRaw<RevenueComparisonRow[]>`
					SELECT
						COALESCE(SUM(
							CASE 
								WHEN pt."created_at" >= ${params.periodStartDate} AND pt."created_at" < ${params.nextPeriodStart} 
								THEN pt."amount_paise" 
								ELSE 0 
							END
						), 0)::bigint AS current_revenue_paise,
						COALESCE(SUM(
							CASE 
								WHEN pt."created_at" >= ${params.prevStartDate} AND pt."created_at" < ${params.periodStartDate} 
								THEN pt."amount_paise" 
								ELSE 0 
							END
						), 0)::bigint AS previous_revenue_paise
					FROM "payment_transactions" pt
					JOIN "subscription_plans" p ON pt."plan_id" = p."id"
					WHERE pt."subscription_id" IS NOT NULL
						AND pt."status"::text IN (${PAYMENT_STATUS.SUCCESS}, ${PAYMENT_STATUS.CAPTURED})
						AND pt."created_at" >= ${params.prevStartDate}
						AND pt."created_at" < ${params.nextPeriodStart}
						AND (${billingCycleFilter} = ${BILLING_CYCLES.ALL} OR p."billing_cycle"::text = ${billingCycleFilter})
				`,

				// 4. Timeline Buckets (batched to prevent connection pool starvation)
				(async (): Promise<TimelineBucketResult[]> => {
					const results: TimelineBucketResult[] = [];
					const BUCKET_BATCH_SIZE = TIMELINE_BUCKET_BATCH_SIZE;

					for (let i = 0; i < params.buckets.length; i += BUCKET_BATCH_SIZE) {
						const chunk = params.buckets.slice(i, i + BUCKET_BATCH_SIZE);
						const chunkResults = await Promise.all(
							chunk.map(async (bucket): Promise<TimelineBucketResult> => {
								const [revRows, newSubRows, mrrRows] = await Promise.all([
									this.prisma.$queryRaw<BucketRevenueRow[]>`
										SELECT COALESCE(SUM(pt."amount_paise"), 0)::bigint AS bucket_revenue_paise
										FROM "payment_transactions" pt
										JOIN "subscription_plans" p ON pt."plan_id" = p."id"
										WHERE pt."subscription_id" IS NOT NULL
											AND pt."status"::text IN (${PAYMENT_STATUS.SUCCESS}, ${PAYMENT_STATUS.CAPTURED})
											AND pt."created_at" >= ${bucket.bucketStart}
											AND pt."created_at" < ${bucket.bucketEnd}
											AND (${billingCycleFilter} = ${BILLING_CYCLES.ALL} OR p."billing_cycle"::text = ${billingCycleFilter})
									`,
									this.prisma.$queryRaw<BucketNewSubRow[]>`
										SELECT COUNT(*)::int AS new_subscriptions_count
										FROM "subscriptions" s
										JOIN "subscription_plans" p ON s."plan_id" = p."id"
										WHERE s."created_at" >= ${bucket.bucketStart}
											AND s."created_at" < ${bucket.bucketEnd}
											AND (${billingCycleFilter} = ${BILLING_CYCLES.ALL} OR p."billing_cycle"::text = ${billingCycleFilter})
									`,
									this.prisma.$queryRaw<BucketMrrRow[]>`
										WITH active_payments_at_boundary AS (
											SELECT DISTINCT ON (pt."restaurant_id")
												pt."restaurant_id",
												p."billing_cycle",
												p."price_paise"
											FROM "payment_transactions" pt
											JOIN "subscription_plans" p ON pt."plan_id" = p."id"
											LEFT JOIN "subscriptions" s ON pt."subscription_id" = s."id"
											WHERE pt."subscription_id" IS NOT NULL
												AND pt."status"::text IN (${PAYMENT_STATUS.SUCCESS}, ${PAYMENT_STATUS.CAPTURED})
												AND pt."created_at" < ${bucket.bucketEnd}
												AND (
													pt."created_at" + (
														CASE 
															WHEN p."billing_cycle"::text = ${BILLING_CYCLES.YEARLY} THEN INTERVAL '1 year'
															ELSE INTERVAL '1 month'
														END
													)
												) >= ${bucket.bucketEnd}
												AND (s."canceled_at" IS NULL OR s."canceled_at" >= ${bucket.bucketEnd})
												AND (${billingCycleFilter} = ${BILLING_CYCLES.ALL} OR p."billing_cycle"::text = ${billingCycleFilter})
											ORDER BY pt."restaurant_id", pt."created_at" DESC
										)
										SELECT
											COALESCE(SUM(
												CASE
													WHEN billing_cycle::text = ${BILLING_CYCLES.MONTHLY} THEN price_paise
													WHEN billing_cycle::text = ${BILLING_CYCLES.YEARLY} THEN ROUND(price_paise / 12.0)
													ELSE 0
												END
											), 0)::bigint AS bucket_mrr_paise
										FROM active_payments_at_boundary
									`,
								]);

								return {
									bucketLabel: bucket.bucketLabel,
									grossRevenuePaise: revRows[0]?.bucket_revenue_paise ?? 0n,
									mrrPaise: mrrRows[0]?.bucket_mrr_paise ?? 0n,
									newSubscriptionsCount: newSubRows[0]?.new_subscriptions_count ?? 0,
								};
							}),
						);
						results.push(...chunkResults);
					}

					return results;
				})(),
			]);

		const activeSub = activeSubResult[0];
		const revenue = revenueResult[0];

		const tierDistribution: Record<string, number> = {};
		for (const row of tierDistributionResult) {
			tierDistribution[row.plan_code] = row.restaurant_count;
		}

		return {
			activeSubscribedRestaurants: activeSub?.active_subscribed_restaurants ?? 0,
			currentMrrPaise: activeSub?.current_mrr_paise ?? 0n,
			currentGrossRevenuePaise: revenue?.current_revenue_paise ?? 0n,
			previousGrossRevenuePaise: revenue?.previous_revenue_paise ?? 0n,
			subscriptionTierDistribution: tierDistribution,
			timelineBuckets,
		};
	}
}
