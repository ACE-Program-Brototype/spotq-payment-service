export const DEFAULT_CURRENCY = 'INR';

export const CURRENCIES = {
	INR: 'INR',
} as const;

export type Currency = (typeof CURRENCIES)[keyof typeof CURRENCIES];

export const PAYMENT_METHODS = {
	UPI: 'UPI',
} as const;

export const DEFAULT_PAYMENT_METHOD = PAYMENT_METHODS.UPI;

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
} as const;

export type RazorpayWebhookEvent =
	(typeof RAZORPAY_WEBHOOK_EVENTS)[keyof typeof RAZORPAY_WEBHOOK_EVENTS];

export const DEFAULT_PAYMENT_FAILURE_REASON = 'Payment failed on gateway';

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
