export const SYSTEM_ROUTES = {
	ROOT: '/',
	HEALTH: '/health',
	READY: '/ready',
	METRICS: '/metrics',
} as const;

export const SUBSCRIPTION_ROUTES = {
	PLANS: '/plans',
	ORDER: '/subscriptions/order',
	VERIFY: '/subscriptions/verify',
	STATUS: '/subscriptions/status',
	STATUS_BY_RESTAURANT: '/subscriptions/status/:restaurantId',
	WEBHOOK: '/webhook',
} as const;

export const PLATFORM_FINANCE_ROUTES = {
	ROOT: '/admin/finance',
	SUMMARY: '/summary',
	LEDGER: '/ledger',
	LEDGER_CSV: '/ledger/export.csv',
} as const;

export const ROUTES = {
	ROOT: SYSTEM_ROUTES.ROOT,
	HEALTH: SYSTEM_ROUTES.HEALTH,
	READY: SYSTEM_ROUTES.READY,
	METRICS: SYSTEM_ROUTES.METRICS,
	PLANS: SUBSCRIPTION_ROUTES.PLANS,
	ORDER: SUBSCRIPTION_ROUTES.ORDER,
	VERIFY: SUBSCRIPTION_ROUTES.VERIFY,
	STATUS: SUBSCRIPTION_ROUTES.STATUS,
	STATUS_BY_RESTAURANT: SUBSCRIPTION_ROUTES.STATUS_BY_RESTAURANT,
	WEBHOOK: SUBSCRIPTION_ROUTES.WEBHOOK,
	SUBSCRIPTIONS: SUBSCRIPTION_ROUTES,
	PLATFORM_FINANCE_SUMMARY: PLATFORM_FINANCE_ROUTES.SUMMARY,
} as const;

export type SystemRoute = (typeof SYSTEM_ROUTES)[keyof typeof SYSTEM_ROUTES];
export type SubscriptionRoute = (typeof SUBSCRIPTION_ROUTES)[keyof typeof SUBSCRIPTION_ROUTES];
export type PlatformFinanceRoute =
	(typeof PLATFORM_FINANCE_ROUTES)[keyof typeof PLATFORM_FINANCE_ROUTES];
