export const DEFAULT_CURRENCY = 'INR';

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
