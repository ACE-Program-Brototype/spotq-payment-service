export const S2S_CALLER_SERVICES = {
	ORDER_SERVICE: 'order-service',
	QUEUE_SERVICE: 'queue-service',
	RESTAURANT_SERVICE: 'restaurant-service',
} as const;

export const ALLOWED_RESTAURANT_OWNER_ROLE = 'RESTAURANT_OWNER' as const;

export type S2SCallerService = (typeof S2S_CALLER_SERVICES)[keyof typeof S2S_CALLER_SERVICES];
