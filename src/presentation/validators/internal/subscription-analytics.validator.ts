import {
	getCurrentDateParts,
	isValidCalendarDate,
} from '@application/utils/subscription-date-range.util.ts';
import {
	ANALYTICS_PERIODS,
	BILLING_CYCLES,
	DEFAULT_ANALYTICS_PERIOD,
	DEFAULT_BILLING_CYCLE,
} from '@shared/constants/analytics.constants.ts';
import { z } from 'zod';

export const subscriptionAnalyticsQuerySchema = z
	.object({
		period: z.nativeEnum(ANALYTICS_PERIODS).default(DEFAULT_ANALYTICS_PERIOD),
		day: z.coerce.number().int().min(1).max(31).optional(),
		month: z.coerce.number().int().min(1).max(12).optional(),
		year: z.coerce.number().int().min(2000).max(2100).optional(),
		billingCycle: z.nativeEnum(BILLING_CYCLES).default(DEFAULT_BILLING_CYCLE),
	})
	.strict()
	.superRefine((data, ctx) => {
		const current = getCurrentDateParts();
		const year = data.year ?? current.year;
		const month = data.month ?? current.month;

		if (data.day !== undefined) {
			if (!isValidCalendarDate(year, month, data.day)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Invalid calendar date: day ${data.day} does not exist in month ${month}/${year}`,
					path: ['day'],
				});
			}
		}
	});

export type SubscriptionAnalyticsQueryParams = z.infer<typeof subscriptionAnalyticsQuerySchema>;

