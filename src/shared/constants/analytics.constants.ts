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

