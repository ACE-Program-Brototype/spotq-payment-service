import type {
	IFinanceQueryRepository,
	PlatformFinanceSummaryReadModel,
} from '@domain/repositories/finance-query.repository.interface';
import { PersistenceError } from '@infrastructure/errors/persistence.error.ts';
import { Prisma } from '@prisma/client';
import { MESSAGES } from '@shared/constants/message.constants.ts';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository';

@injectable()
export class PrismaFinanceQueryRepository
	extends PrismaBaseRepository
	implements IFinanceQueryRepository
{
	async getPlatformSummary(): Promise<PlatformFinanceSummaryReadModel> {
		const query = Prisma.sql`
			/*
			 * Platform Finance Summary
			 *
			 * Aggregates platform financial metrics into a single result.
			 * Uses CTEs to keep each metric independent and avoid
			 * multiplying aggregate values through joins.
			 */

			WITH

			-- --------------------------------------------------
			-- Indian calendar-day boundaries
			-- --------------------------------------------------
			date_bounds AS (
				SELECT
					local_now::date AS today,
					(local_now::date::timestamp AT TIME ZONE 'Asia/Kolkata') AS start_of_day,
					((local_now::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata') AS start_of_tomorrow
				FROM (
					SELECT NOW() AT TIME ZONE 'Asia/Kolkata' AS local_now
				) AS clock
			),

			-- --------------------------------------------------
			-- Platform wallet metrics
			-- --------------------------------------------------
			wallet_metrics AS (
				SELECT
					COALESCE(SUM(total_platform_balance_paise), 0)::bigint AS master_balance_paise,
					COALESCE(SUM(total_disbursed_to_venues_paise), 0)::bigint AS lifetime_disbursed_paise,
					COALESCE(SUM(total_refunded_paise), 0)::bigint AS total_refunds_processed_paise
				FROM platform_wallets
				WHERE currency = 'INR'
			),

			-- --------------------------------------------------
			-- Today's customer payment turnover
			-- --------------------------------------------------
			turnover_metrics AS (
				SELECT
					COALESCE(SUM(plt.amount_paise), 0)::bigint AS today_turnover_paise
				FROM platform_ledger_transactions AS plt
				INNER JOIN platform_wallets AS pw
					ON pw.id = plt.platform_wallet_id
				CROSS JOIN date_bounds AS db
				WHERE
					pw.currency = 'INR'
					AND plt.type = 'CUSTOMER_PAYMENT_INTAKE'
					AND plt.created_at >= db.start_of_day
					AND plt.created_at < db.start_of_tomorrow
			),

			-- --------------------------------------------------
			-- Pending settlement amount
			-- --------------------------------------------------
			settlement_metrics AS (
				SELECT
					COALESCE(SUM(s.net_credit_paise), 0)::bigint AS tonight_eod_payout_queue_paise
				FROM settlements AS s
				CROSS JOIN date_bounds AS db
				WHERE
					s.status IN ('PENDING', 'CALCULATING')
					AND s.settlement_date <= db.today
			),

			-- --------------------------------------------------
			-- Active subscription MRR and venue count
			-- --------------------------------------------------
			subscription_metrics AS (
				SELECT
					COALESCE(
						SUM(
							CASE
								-- Normalize yearly subscriptions to monthly revenue.
								WHEN sp.billing_cycle = 'YEARLY'
									THEN ROUND(sp.price_paise::numeric / 12)
								ELSE sp.price_paise::numeric
							END
						),
						0
					)::bigint AS saas_subscription_mrr_paise,

					COUNT(DISTINCT s.restaurant_id)::integer AS active_venues_count
				FROM subscriptions AS s
				INNER JOIN subscription_plans AS sp
					ON sp.id = s.plan_id
				WHERE
					s.status = 'ACTIVE'
					AND s.current_period_start <= NOW()
					AND s.current_period_end >= NOW()
					AND sp.currency = 'INR'
			)

			-- --------------------------------------------------
			-- Final finance summary projection
			-- --------------------------------------------------
			SELECT
				'INR'::text AS currency,
				wm.master_balance_paise AS "masterBalancePaise",
				tm.today_turnover_paise AS "todayTurnoverPaise",
				sm.tonight_eod_payout_queue_paise AS "tonightEodPayoutQueuePaise",
				wm.lifetime_disbursed_paise AS "lifetimeDisbursedPaise",
				wm.total_refunds_processed_paise AS "totalRefundsProcessedPaise",
				subm.saas_subscription_mrr_paise AS "saasSubscriptionMrrPaise",
				subm.active_venues_count AS "activeVenuesCount"
			FROM wallet_metrics AS wm
			CROSS JOIN turnover_metrics AS tm
			CROSS JOIN settlement_metrics AS sm
			CROSS JOIN subscription_metrics AS subm;
		`;

		const [summary] = await this.executePrisma(() =>
			this.prisma.$queryRaw<PlatformFinanceSummaryReadModel[]>(query),
		);

		if (!summary) {
			throw new PersistenceError(MESSAGES.PLATFORM_FINANCE_SUMMARY_RETRIEVAL_FAILED);
		}

		return summary;
	}
}
