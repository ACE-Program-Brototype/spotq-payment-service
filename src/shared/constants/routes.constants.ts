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
	RENEW: '/subscriptions/:subscriptionId/renew',
	HISTORY: '/subscriptions/restaurants/:restaurantId/history',
	WEBHOOK: '/webhook',
} as const;

export const TRANSACTION_ROUTES = {
	BASE: '/transactions',
	BY_ID: '/transactions/:id',
	API_V1_BASE: '/api/v1/payments/transactions',
	API_V1_BY_ID: '/api/v1/payments/transactions/:id',
	INVOICE: '/transactions/:id/invoice',
	API_V1_INVOICE: '/api/v1/payments/transactions/:id/invoice',
} as const;

export const buildTransactionInvoiceUrl = (transactionId: string): string =>
	TRANSACTION_ROUTES.API_V1_INVOICE.replace(':id', transactionId);

export const PLATFORM_FINANCE_ROUTES = {
	ROOT: '/admin/finance',
	SUMMARY: '/summary',
	LEDGER: '/ledger',
	LEDGER_CSV: '/ledger/export.csv',
} as const;

export const RESTAURANT_WALLET_ROUTES = {
	ROOT: '/wallets',
	WALLET: '/',
	LINK_BANK: '/bank-account',
	WITHDRAW: '/withdraw',
} as const;

export const INTERNAL_ROUTES = {
	BASE: '/api/internal/v1',
	CREATE_GATEWAY_ORDER: '/payments/orders',
	REFUND: '/payments/refunds',
	SUBSCRIPTION_ANALYTICS: '/analytics/subscriptions/summary',
} as const;

export const ORDER_PAYMENT_ROUTES = {
	CREATE_GATEWAY_ORDER: `${INTERNAL_ROUTES.BASE}${INTERNAL_ROUTES.CREATE_GATEWAY_ORDER}`,
	REFUND: `${INTERNAL_ROUTES.BASE}/payments/refunds`,
	VERIFY: '/orders/verify',
	STATUS: '/orders/:orderId/status',
} as const;

export const CUSTOMER_PAYMENT_ROUTES = {
	HISTORY: '/history',
	RETRY: '/transactions/:id/retry',
} as const;

export const SUBSCRIBER_ROUTES = {
	BASE: '/subscribers',
	BY_ID: '/subscribers/:subscriberId',
	API_V1_BASE: '/api/v1/subscribers',
	API_V1_BY_ID: '/api/v1/subscribers/:subscriberId',
} as const;

export const RESTAURANT_SERVICE_ROUTES = {
	BATCH: '/api/internal/v1/restaurants/batch',
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
	TRANSACTIONS: TRANSACTION_ROUTES,
	PLATFORM_FINANCE_SUMMARY: PLATFORM_FINANCE_ROUTES.SUMMARY,
	INTERNAL: INTERNAL_ROUTES,
	ORDER_PAYMENTS: ORDER_PAYMENT_ROUTES,
	CUSTOMER_PAYMENTS: CUSTOMER_PAYMENT_ROUTES,
	SUBSCRIBERS: SUBSCRIBER_ROUTES,
} as const;

export type SystemRoute = (typeof SYSTEM_ROUTES)[keyof typeof SYSTEM_ROUTES];
export type SubscriptionRoute = (typeof SUBSCRIPTION_ROUTES)[keyof typeof SUBSCRIPTION_ROUTES];
export type TransactionRoute = (typeof TRANSACTION_ROUTES)[keyof typeof TRANSACTION_ROUTES];
export type PlatformFinanceRoute =
	(typeof PLATFORM_FINANCE_ROUTES)[keyof typeof PLATFORM_FINANCE_ROUTES];
export type InternalRoute = (typeof INTERNAL_ROUTES)[keyof typeof INTERNAL_ROUTES];
export type OrderPaymentRoute = (typeof ORDER_PAYMENT_ROUTES)[keyof typeof ORDER_PAYMENT_ROUTES];
export type CustomerPaymentRoute =
	(typeof CUSTOMER_PAYMENT_ROUTES)[keyof typeof CUSTOMER_PAYMENT_ROUTES];
export type SubscriberRoute = (typeof SUBSCRIBER_ROUTES)[keyof typeof SUBSCRIBER_ROUTES];
