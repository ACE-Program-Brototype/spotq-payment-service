import type {
	ResolvedSubscriptionDateRange,
	SubscriptionDateRangeFilterParams,
	TimelineBucketDefinition,
} from '@domain/types/subscription-analytics.types.ts';
import {
	ANALYTICS_PERIODS,
	DAYS_IN_WEEK,
	DEFAULT_TIMEZONE,
	HOURS_IN_DAY,
	MONDAY_START_WEEK_DAY_LABELS,
	MONTH_NAMES,
	MONTHS_IN_A_YEAR,
	WEEKDAY_MONDAY_OFFSETS,
} from '@shared/constants/analytics.constants.ts';

const BASE_WEEKLY_RANGES: ReadonlyArray<{ label: string; start: number; end: number }> = [
	{ label: 'Week 1', start: 1, end: 7 },
	{ label: 'Week 2', start: 8, end: 14 },
	{ label: 'Week 3', start: 15, end: 21 },
	{ label: 'Week 4', start: 22, end: 28 },
];

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return false;
	}
	const utcDate = new Date(Date.UTC(year, month - 1, day));
	return (
		utcDate.getUTCFullYear() === year &&
		utcDate.getUTCMonth() === month - 1 &&
		utcDate.getUTCDate() === day
	);
}

export function getZonedDate(
	year: number,
	month: number, // 1-12
	day: number,
	hour = 0,
	minute = 0,
	second = 0,
	timeZone: string = DEFAULT_TIMEZONE,
): Date {
	const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
		hourCycle: 'h23',
	});

	const parts = formatter.formatToParts(utcGuess);
	const partMap: Record<string, number> = {};
	for (const part of parts) {
		if (part.type !== 'literal') {
			partMap[part.type] = Number.parseInt(part.value, 10);
		}
	}

	const zonedAsUtc = Date.UTC(
		partMap.year,
		partMap.month - 1,
		partMap.day,
		partMap.hour === 24 ? 0 : partMap.hour,
		partMap.minute,
		partMap.second,
	);

	const offsetMs = zonedAsUtc - utcGuess.getTime();
	return new Date(utcGuess.getTime() - offsetMs);
}

export function getCurrentDateParts(timeZone: string = DEFAULT_TIMEZONE): {
	year: number;
	month: number;
	day: number;
} {
	const now = new Date();
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
	const parts = formatter.formatToParts(now);
	const currentParts: Record<string, number> = {};
	for (const p of parts) {
		if (p.type !== 'literal') {
			currentParts[p.type] = Number.parseInt(p.value, 10);
		}
	}
	return {
		year: currentParts.year,
		month: currentParts.month,
		day: currentParts.day,
	};
}

export function resolveSubscriptionDateRange(
	filter: SubscriptionDateRangeFilterParams,
	timeZone: string = DEFAULT_TIMEZONE,
): ResolvedSubscriptionDateRange {
	const current = getCurrentDateParts(timeZone);
	const year = filter.year ?? current.year;
	const month = filter.month ?? current.month;
	const period = filter.period ?? ANALYTICS_PERIODS.MONTH;

	let day: number | null = null;
	let periodStartDate: Date;
	let nextPeriodStart: Date;
	let prevStartDate: Date;
	const buckets: TimelineBucketDefinition[] = [];

	switch (period) {
		case ANALYTICS_PERIODS.DAY: {
			const resolvedDay = filter.day ?? current.day;
			day = resolvedDay;
			periodStartDate = getZonedDate(year, month, resolvedDay, 0, 0, 0, timeZone);
			nextPeriodStart = getZonedDate(year, month, resolvedDay + 1, 0, 0, 0, timeZone);
			prevStartDate = getZonedDate(year, month, resolvedDay - 1, 0, 0, 0, timeZone);

			for (let h = 0; h < HOURS_IN_DAY; h++) {
				buckets.push({
					bucketLabel: `${String(h).padStart(2, '0')}:00`,
					bucketStart: getZonedDate(year, month, resolvedDay, h, 0, 0, timeZone),
					bucketEnd: getZonedDate(year, month, resolvedDay, h + 1, 0, 0, timeZone),
				});
			}
			break;
		}

		case ANALYTICS_PERIODS.WEEK: {
			const refDay = filter.day ?? current.day;
			day = refDay;
			const targetDate = getZonedDate(year, month, refDay, 0, 0, 0, timeZone);
			const weekday = new Intl.DateTimeFormat('en-US', {
				timeZone,
				weekday: 'short',
			}).format(targetDate);

			const mondayOffset = WEEKDAY_MONDAY_OFFSETS[weekday] ?? 0;

			periodStartDate = getZonedDate(year, month, refDay + mondayOffset, 0, 0, 0, timeZone);
			nextPeriodStart = getZonedDate(
				year,
				month,
				refDay + mondayOffset + DAYS_IN_WEEK,
				0,
				0,
				0,
				timeZone,
			);
			prevStartDate = getZonedDate(
				year,
				month,
				refDay + mondayOffset - DAYS_IN_WEEK,
				0,
				0,
				0,
				timeZone,
			);

			for (let i = 0; i < DAYS_IN_WEEK; i++) {
				buckets.push({
					bucketLabel: MONDAY_START_WEEK_DAY_LABELS[i],
					bucketStart: getZonedDate(year, month, refDay + mondayOffset + i, 0, 0, 0, timeZone),
					bucketEnd: getZonedDate(year, month, refDay + mondayOffset + i + 1, 0, 0, 0, timeZone),
				});
			}
			break;
		}

		case ANALYTICS_PERIODS.MONTH: {
			day = null;
			periodStartDate = getZonedDate(year, month, 1, 0, 0, 0, timeZone);
			nextPeriodStart = getZonedDate(year, month + 1, 1, 0, 0, 0, timeZone);
			prevStartDate = getZonedDate(year, month - 1, 1, 0, 0, 0, timeZone);

			const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
			const weeklyRanges = [...BASE_WEEKLY_RANGES];
			if (daysInMonth > 28) {
				weeklyRanges.push({ label: 'Week 5', start: 29, end: daysInMonth });
			}

			for (const r of weeklyRanges) {
				buckets.push({
					bucketLabel: r.label,
					bucketStart: getZonedDate(year, month, r.start, 0, 0, 0, timeZone),
					bucketEnd: getZonedDate(year, month, r.end + 1, 0, 0, 0, timeZone),
				});
			}
			break;
		}

		case ANALYTICS_PERIODS.YEAR: {
			day = null;
			periodStartDate = getZonedDate(year, 1, 1, 0, 0, 0, timeZone);
			nextPeriodStart = getZonedDate(year + 1, 1, 1, 0, 0, 0, timeZone);
			prevStartDate = getZonedDate(year - 1, 1, 1, 0, 0, 0, timeZone);

			for (let m = 1; m <= MONTHS_IN_A_YEAR; m++) {
				buckets.push({
					bucketLabel: MONTH_NAMES[m - 1],
					bucketStart: getZonedDate(year, m, 1, 0, 0, 0, timeZone),
					bucketEnd: getZonedDate(year, m + 1, 1, 0, 0, 0, timeZone),
				});
			}
			break;
		}
	}

	return {
		period,
		day,
		month,
		year,
		periodStartDate,
		nextPeriodStart,
		prevStartDate,
		buckets,
	};
}
