export const S2S_CALLER_SERVICES = {
	ORDER_SERVICE: 'order-service',
	QUEUE_SERVICE: 'queue-service',
	RESTAURANT_SERVICE: 'restaurant-service',
} as const;

export const ALLOWED_RESTAURANT_OWNER_ROLE = 'RESTAURANT_OWNER' as const;

export type S2SCallerService = (typeof S2S_CALLER_SERVICES)[keyof typeof S2S_CALLER_SERVICES];

export const USER_ROLES = {
	PLATFORM_ADMIN: 'PLATFORM_ADMIN',
	RESTAURANT_ADMIN: 'RESTAURANT_ADMIN',
	STAFF: 'STAFF',
	CUSTOMER: 'CUSTOMER',
} as const;

export const ALLOWED_RESTAURANT_ROLES = new Set<string>([
	ALLOWED_RESTAURANT_OWNER_ROLE,
	USER_ROLES.RESTAURANT_ADMIN,
]);

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
