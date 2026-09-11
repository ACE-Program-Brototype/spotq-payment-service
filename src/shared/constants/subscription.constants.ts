export const PENDING_ORDER_REUSE_WINDOW_MS = 15 * 60 * 1000;
export const OUTBOX_RELAY_INTERVAL_MS = 5000;
export const EXPIRY_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export const SUBSCRIPTION_EVENTS = {
	ACTIVATED: 'subscription.activated',
	EXPIRED: 'subscription.expired',
} as const;

export const PAYMENT_STATUS = {
	CREATED: 'CREATED',
	SUCCESS: 'SUCCESS',
	FAILED: 'FAILED',
	REFUNDED: 'REFUNDED',
} as const;

export const SUBSCRIPTION_STATUS = {
	PENDING: 'PENDING',
	ACTIVE: 'ACTIVE',
	EXPIRED: 'EXPIRED',
	CANCELLED: 'CANCELLED',
	PAST_DUE: 'PAST_DUE',
} as const;
