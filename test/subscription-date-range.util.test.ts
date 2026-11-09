import {
	getZonedDate,
	isValidCalendarDate,
	resolveSubscriptionDateRange,
} from '@application/utils/subscription-date-range.util.ts';
import { ANALYTICS_PERIODS } from '@shared/constants/analytics.constants.ts';

describe('subscription-date-range.util', () => {
	describe('isValidCalendarDate', () => {
		it('should return true for valid calendar dates', () => {
			expect(isValidCalendarDate(2026, 1, 15)).toBe(true);
			expect(isValidCalendarDate(2026, 1, 31)).toBe(true);
			expect(isValidCalendarDate(2026, 4, 30)).toBe(true);
			expect(isValidCalendarDate(2026, 12, 31)).toBe(true);
		});

		it('should validate leap years correctly for February 29', () => {
			// 2024 is leap year
			expect(isValidCalendarDate(2024, 2, 29)).toBe(true);
			// 2025 and 2026 are not leap years
			expect(isValidCalendarDate(2025, 2, 29)).toBe(false);
			expect(isValidCalendarDate(2026, 2, 29)).toBe(false);
		});

		it('should return false for invalid day numbers for the given month', () => {
			expect(isValidCalendarDate(2026, 2, 30)).toBe(false);
			expect(isValidCalendarDate(2026, 2, 31)).toBe(false);
			expect(isValidCalendarDate(2026, 4, 31)).toBe(false);
			expect(isValidCalendarDate(2026, 6, 31)).toBe(false);
			expect(isValidCalendarDate(2026, 9, 31)).toBe(false);
			expect(isValidCalendarDate(2026, 11, 31)).toBe(false);
		});

		it('should return false for out-of-range months and days', () => {
			expect(isValidCalendarDate(2026, 0, 15)).toBe(false);
			expect(isValidCalendarDate(2026, 13, 15)).toBe(false);
			expect(isValidCalendarDate(2026, 5, 0)).toBe(false);
			expect(isValidCalendarDate(2026, 5, 32)).toBe(false);
		});
	});

	describe('getZonedDate', () => {
		it('should produce a UTC date corresponding to midnight in Asia/Kolkata', () => {
			const date = getZonedDate(2026, 11, 10, 0, 0, 0, 'Asia/Kolkata');
			// Asia/Kolkata is UTC+5:30, so 2026-11-10 00:00:00 IST is 2026-11-09 18:30:00 UTC
			expect(date.toISOString()).toBe('2026-11-09T18:30:00.000Z');
		});
	});

	describe('resolveSubscriptionDateRange', () => {
		it('should resolve MONTH interval with 5 weekly buckets for a 31-day month', () => {
			const result = resolveSubscriptionDateRange({
				period: ANALYTICS_PERIODS.MONTH,
				month: 1, // Jan has 31 days
				year: 2026,
			});

			expect(result.period).toBe(ANALYTICS_PERIODS.MONTH);
			expect(result.month).toBe(1);
			expect(result.year).toBe(2026);
			expect(result.day).toBeNull();
			expect(result.buckets).toHaveLength(5);
			expect(result.buckets[0].bucketLabel).toBe('Week 1');
			expect(result.buckets[1].bucketLabel).toBe('Week 2');
			expect(result.buckets[2].bucketLabel).toBe('Week 3');
			expect(result.buckets[3].bucketLabel).toBe('Week 4');
			expect(result.buckets[4].bucketLabel).toBe('Week 5');

			// Check period boundaries
			expect(result.periodStartDate.toISOString()).toBe('2025-12-31T18:30:00.000Z'); // 2026-01-01 00:00:00 IST
			expect(result.nextPeriodStart.toISOString()).toBe('2026-01-31T18:30:00.000Z'); // 2026-02-01 00:00:00 IST
			expect(result.prevStartDate.toISOString()).toBe('2025-11-30T18:30:00.000Z'); // 2025-12-01 00:00:00 IST
		});

		it('should resolve MONTH interval with 4 weekly buckets for a 28-day month (Feb 2026)', () => {
			const result = resolveSubscriptionDateRange({
				period: ANALYTICS_PERIODS.MONTH,
				month: 2, // Feb 2026 has 28 days
				year: 2026,
			});

			expect(result.buckets).toHaveLength(4);
			expect(result.buckets[3].bucketLabel).toBe('Week 4');
		});

		it('should resolve YEAR interval with 12 monthly buckets', () => {
			const result = resolveSubscriptionDateRange({
				period: ANALYTICS_PERIODS.YEAR,
				year: 2026,
			});

			expect(result.period).toBe(ANALYTICS_PERIODS.YEAR);
			expect(result.buckets).toHaveLength(12);
			expect(result.buckets[0].bucketLabel).toBe('Jan');
			expect(result.buckets[11].bucketLabel).toBe('Dec');
		});

		it('should resolve WEEK interval with 7 daily buckets (Mon-Sun)', () => {
			const result = resolveSubscriptionDateRange({
				period: ANALYTICS_PERIODS.WEEK,
				day: 10,
				month: 11,
				year: 2026,
			});

			expect(result.period).toBe(ANALYTICS_PERIODS.WEEK);
			expect(result.day).toBe(10);
			expect(result.buckets).toHaveLength(7);
			expect(result.buckets.map((b) => b.bucketLabel)).toEqual([
				'Mon',
				'Tue',
				'Wed',
				'Thu',
				'Fri',
				'Sat',
				'Sun',
			]);
		});

		it('should resolve DAY interval with 24 hourly buckets', () => {
			const result = resolveSubscriptionDateRange({
				period: ANALYTICS_PERIODS.DAY,
				day: 10,
				month: 11,
				year: 2026,
			});

			expect(result.period).toBe(ANALYTICS_PERIODS.DAY);
			expect(result.day).toBe(10);
			expect(result.buckets).toHaveLength(24);
			expect(result.buckets[0].bucketLabel).toBe('00:00');
			expect(result.buckets[23].bucketLabel).toBe('23:00');
		});
	});
});

