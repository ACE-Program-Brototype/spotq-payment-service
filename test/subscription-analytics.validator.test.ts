import { subscriptionAnalyticsQuerySchema } from '@presentation/validators/internal/subscription-analytics.validator.ts';
import { ANALYTICS_PERIODS, BILLING_CYCLES } from '@shared/constants/analytics.constants.ts';

describe('subscriptionAnalyticsQuerySchema', () => {
	it('should supply default values for empty query', () => {
		const parsed = subscriptionAnalyticsQuerySchema.parse({});
		expect(parsed.period).toBe(ANALYTICS_PERIODS.MONTH);
		expect(parsed.billingCycle).toBe(BILLING_CYCLES.ALL);
	});

	it('should parse valid customized query parameters', () => {
		const parsed = subscriptionAnalyticsQuerySchema.parse({
			period: 'DAY',
			day: '15',
			month: '8',
			year: '2026',
			billingCycle: 'YEARLY',
		});
		expect(parsed.period).toBe(ANALYTICS_PERIODS.DAY);
		expect(parsed.day).toBe(15);
		expect(parsed.month).toBe(8);
		expect(parsed.year).toBe(2026);
		expect(parsed.billingCycle).toBe(BILLING_CYCLES.YEARLY);
	});

	it('should accept valid leap year date February 29 2024', () => {
		const parsed = subscriptionAnalyticsQuerySchema.parse({
			period: 'DAY',
			day: 29,
			month: 2,
			year: 2024,
		});
		expect(parsed.day).toBe(29);
		expect(parsed.month).toBe(2);
	});

	it('should reject invalid calendar date February 29 2026 (non-leap year)', () => {
		const result = subscriptionAnalyticsQuerySchema.safeParse({
			day: 29,
			month: 2,
			year: 2026,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Invalid calendar date');
		}
	});

	it('should reject invalid calendar date February 31', () => {
		const result = subscriptionAnalyticsQuerySchema.safeParse({
			day: 31,
			month: 2,
			year: 2026,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Invalid calendar date');
		}
	});

	it('should reject unknown extra properties due to strict mode', () => {
		const result = subscriptionAnalyticsQuerySchema.safeParse({
			period: 'MONTH',
			unknownField: 'malicious',
		});
		expect(result.success).toBe(false);
	});

	it('should reject unsupported periods and billing cycles', () => {
		const badPeriod = subscriptionAnalyticsQuerySchema.safeParse({ period: 'HOURLY' });
		expect(badPeriod.success).toBe(false);

		const badCycle = subscriptionAnalyticsQuerySchema.safeParse({ billingCycle: 'BIWEEKLY' });
		expect(badCycle.success).toBe(false);
	});
});
