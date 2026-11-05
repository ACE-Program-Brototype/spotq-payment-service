export const S2S_CALLER_SERVICES = {
	ORDER_SERVICE: 'order-service',
	QUEUE_SERVICE: 'queue-service',
	RESTAURANT_SERVICE: 'restaurant-service',
} as const;

export const ALLOWED_ROLES = ['RESTAURANT_ADMIN'] as const;

export type S2SCallerService = (typeof S2S_CALLER_SERVICES)[keyof typeof S2S_CALLER_SERVICES];
