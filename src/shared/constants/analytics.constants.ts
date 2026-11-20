export const ANALYTICS_PERIODS = {
	DAY: 'DAY',
	WEEK: 'WEEK',
	MONTH: 'MONTH',
	YEAR: 'YEAR',
} as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[keyof typeof ANALYTICS_PERIODS];

export const BILLING_CYCLES = {
	ALL: 'ALL',
	MONTHLY: 'MONTHLY',
	YEARLY: 'YEARLY',
} as const;

export type BillingCycle = (typeof BILLING_CYCLES)[keyof typeof BILLING_CYCLES];

export const DEFAULT_ANALYTICS_PERIOD: AnalyticsPeriod = ANALYTICS_PERIODS.MONTH;
export const DEFAULT_BILLING_CYCLE: BillingCycle = BILLING_CYCLES.ALL;
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const PAISE_PER_RUPEE = 100;
export const MONTHS_IN_A_YEAR = 12;
export const HOURS_IN_DAY = 24;
export const DAYS_IN_WEEK = 7;
export const TIMELINE_BUCKET_BATCH_SIZE = 3;

export const DECIMAL_PRECISION = {
	CURRENCY: 2,
	PERCENTAGE: 2,
} as const;

export const ANALYTICS_QUERY_LIMITS = {
	MIN_YEAR: 2000,
	MAX_YEAR: 2100,
	MIN_MONTH: 1,
	MAX_MONTH: 12,
	MIN_DAY: 1,
	MAX_DAY: 31,
} as const;

export const MONTH_NAMES = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
] as const;

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const MONDAY_START_WEEK_DAY_LABELS = [
	'Mon',
	'Tue',
	'Wed',
	'Thu',
	'Fri',
	'Sat',
	'Sun',
] as const;

export const WEEKDAY_MONDAY_OFFSETS: Record<string, number> = {
	Mon: 0,
	Tue: -1,
	Wed: -2,
	Thu: -3,
	Fri: -4,
	Sat: -5,
	Sun: -6,
} as const;
