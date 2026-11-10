export const DEFAULT_CURRENCY = 'INR';

export const PAYMENT_DOMAIN_ERROR_CODES = {
	PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
	ACTIVE_SUBSCRIPTION_EXISTS: 'ACTIVE_SUBSCRIPTION_EXISTS',
	PAYMENT_ORDER_NOT_FOUND: 'PAYMENT_ORDER_NOT_FOUND',
	INVALID_PAYMENT_SIGNATURE: 'INVALID_PAYMENT_SIGNATURE',
	PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
	UNAUTHORIZED_RESTAURANT: 'UNAUTHORIZED_RESTAURANT',
	ORDER_PAYMENT_NOT_FOUND: 'ORDER_PAYMENT_NOT_FOUND',
	CUSTOMER_UNAUTHORIZED: 'CUSTOMER_UNAUTHORIZED',
	INVALID_PAYMENT_STATE_TRANSITION: 'INVALID_PAYMENT_STATE_TRANSITION',
	PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
	PAYMENT_GATEWAY_REQUEST_NOT_SENT: 'PAYMENT_GATEWAY_REQUEST_NOT_SENT',
	INVALID_BANK_ACCOUNT: 'INVALID_BANK_ACCOUNT',
} as const;

export const CURRENCIES = {
	INR: 'INR',
} as const;

export type Currency = (typeof CURRENCIES)[keyof typeof CURRENCIES];

export const PAYMENT_METHODS = {
	ONLINE: 'ONLINE',
} as const;

export const DEFAULT_PAYMENT_METHOD = PAYMENT_METHODS.ONLINE;

export const PAYMENT_RECEIPT = {
	ORDER_PREFIX: 'ord_',
	SUBSCRIPTION_PREFIX: 'rcpt_',
	MAX_ID_LENGTH: 30,
	SUBSCRIPTION_RESTAURANT_ID_LENGTH: 10,
	STRIP_HYPHENS_REGEX: /-/g,
} as const;

export const RAZORPAY_WEBHOOK_EVENTS = {
	PAYMENT_CAPTURED: 'payment.captured',
	ORDER_PAID: 'order.paid',
	PAYMENT_FAILED: 'payment.failed',
	PAYOUT_PROCESSED: 'payout.processed',
	PAYOUT_REJECTED: 'payout.rejected',
	PAYOUT_FAILED: 'payout.failed',
	PAYOUT_REVERSED: 'payout.reversed',
	REFUND_PROCESSED: 'refund.processed',
	REFUND_FAILED: 'refund.failed',
} as const;

export type RazorpayWebhookEvent =
	(typeof RAZORPAY_WEBHOOK_EVENTS)[keyof typeof RAZORPAY_WEBHOOK_EVENTS];

export const RAZORPAY_REFUND_STATUS = {
	PENDING: 'pending',
	PROCESSED: 'processed',
	FAILED: 'failed',
} as const;

export type RazorpayRefundStatus =
	(typeof RAZORPAY_REFUND_STATUS)[keyof typeof RAZORPAY_REFUND_STATUS];

export const RAZORPAY_REFUND_SPEED = {
	OPTIMUM: 'optimum',
	NORMAL: 'normal',
} as const;

export type RazorpayRefundSpeed =
	(typeof RAZORPAY_REFUND_SPEED)[keyof typeof RAZORPAY_REFUND_SPEED];

export const DEFAULT_REFUND_SPEED = RAZORPAY_REFUND_SPEED.OPTIMUM;

export const PAYMENT_EVENTS = {
	ORDER_CAPTURED: 'payment.order.captured',
	ORDER_FAILED: 'payment.order.failed',
} as const;

export type PaymentEvent = (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS];

export const DEFAULT_PAYMENT_FAILURE_REASON = 'Payment failed on gateway';

export const REFUND_STATUS = {
	PENDING: 'PENDING',
	PROCESSED: 'PROCESSED',
	FAILED: 'FAILED',
} as const;

export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

export const REFUND_REASONS = {
	CUSTOMER_CANCELLED: 'CUSTOMER_CANCELLED',
} as const;

export type RefundReason = (typeof REFUND_REASONS)[keyof typeof REFUND_REASONS];

export const DEFAULT_REFUND_REASON = REFUND_REASONS.CUSTOMER_CANCELLED;

export const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours
export const REFUND_IDEMPOTENCY_KEY_PREFIX = 'idempotency:refund:';
export const REFUND_LOCK_KEY_PREFIX = 'lock:refund:';
export const REFUND_LOCK_TTL_SECONDS = 15;

export const RABBITMQ_QUEUES = {
	ORDER_EVENTS: 'order-events',
} as const;

export type RabbitMQQueue = (typeof RABBITMQ_QUEUES)[keyof typeof RABBITMQ_QUEUES];

export const OUTBOX_STATUS = {
	PENDING: 'PENDING',
	PUBLISHED: 'PUBLISHED',
	FAILED: 'FAILED',
} as const;

export type OutboxStatus = (typeof OUTBOX_STATUS)[keyof typeof OUTBOX_STATUS];

export const PAYMENT_SORT_FIELDS = {
	CREATED_AT: 'createdAt',
	AMOUNT_PAISE: 'amountPaise',
} as const;

export type PaymentSortField = (typeof PAYMENT_SORT_FIELDS)[keyof typeof PAYMENT_SORT_FIELDS];

export const SORT_DIRECTIONS = {
	ASC: 'asc',
	DESC: 'desc',
} as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[keyof typeof SORT_DIRECTIONS];

export const PAGINATION = {
	DEFAULT_PAGE: 1,
	DEFAULT_LIMIT: 10,
	MAX_LIMIT: 50,
} as const;

export const PENDING_ORDER_REUSE_WINDOW_MS = 15 * 60 * 1000;
