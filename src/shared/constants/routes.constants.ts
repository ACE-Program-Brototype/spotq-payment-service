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

export const INTERNAL_ROUTES = {
	BASE: '/api/internal/v1',
	CREATE_GATEWAY_ORDER: '/payments/orders/create-gateway-order',
} as const;

export const ORDER_PAYMENT_ROUTES = {
	CREATE_GATEWAY_ORDER: `${INTERNAL_ROUTES.BASE}${INTERNAL_ROUTES.CREATE_GATEWAY_ORDER}`,
	VERIFY: '/orders/verify',
	STATUS: '/orders/:orderId/status',
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
	INTERNAL: INTERNAL_ROUTES,
	ORDER_PAYMENTS: ORDER_PAYMENT_ROUTES,
} as const;

export type SystemRoute = (typeof SYSTEM_ROUTES)[keyof typeof SYSTEM_ROUTES];
export type SubscriptionRoute = (typeof SUBSCRIPTION_ROUTES)[keyof typeof SUBSCRIPTION_ROUTES];
export type InternalRoute = (typeof INTERNAL_ROUTES)[keyof typeof INTERNAL_ROUTES];
export type OrderPaymentRoute = (typeof ORDER_PAYMENT_ROUTES)[keyof typeof ORDER_PAYMENT_ROUTES];
