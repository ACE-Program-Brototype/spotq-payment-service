import {
	subscriptionBillingHistoryParamsSchema,
	subscriptionBillingHistoryQuerySchema,
} from '@presentation/validators/subscriptions/subscription-billing-history.validator.ts';
import { MESSAGES, PAYMENT_STATUS } from '@shared/constants/index.ts';

describe('SubscriptionBillingHistoryValidators', () => {
	describe('subscriptionBillingHistoryParamsSchema', () => {
		it('should accept valid UUID restaurantId', () => {
			const result = subscriptionBillingHistoryParamsSchema.safeParse({
				restaurantId: '11111111-1111-4111-8111-111111111111',
			});
			expect(result.success).toBe(true);
		});

		it('should reject non-UUID restaurantId', () => {
			const result = subscriptionBillingHistoryParamsSchema.safeParse({
				restaurantId: 'not-a-uuid',
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(MESSAGES.INVALID_RESTAURANT_ID);
			}
		});

		it('should reject unknown extra properties due to strict mode', () => {
			const result = subscriptionBillingHistoryParamsSchema.safeParse({
				restaurantId: '11111111-1111-4111-8111-111111111111',
				unknownProp: 'bad',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('subscriptionBillingHistoryQuerySchema', () => {
		it('should apply default values when query params are empty', () => {
			const result = subscriptionBillingHistoryQuerySchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1);
				expect(result.data.limit).toBe(10);
				expect(result.data.status).toBeUndefined();
			}
		});

		it('should accept valid status filters', () => {
			for (const status of [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FAILED]) {
				const result = subscriptionBillingHistoryQuerySchema.safeParse({
					status,
					page: '2',
					limit: '25',
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.status).toBe(status);
					expect(result.data.page).toBe(2);
					expect(result.data.limit).toBe(25);
				}
			}
		});

		it('should reject unsupported status filter values', () => {
			for (const status of ['CAPTURED', 'CREATED']) {
				const result = subscriptionBillingHistoryQuerySchema.safeParse({
					status,
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0]?.message).toBe(MESSAGES.INVALID_STATUS_FILTER);
				}
			}
		});

		it('should reject page < 1', () => {
			const result = subscriptionBillingHistoryQuerySchema.safeParse({
				page: 0,
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(MESSAGES.PAGE_MIN_ONE);
			}
		});

		it('should reject limit > 50', () => {
			const result = subscriptionBillingHistoryQuerySchema.safeParse({
				limit: 51,
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(MESSAGES.LIMIT_MAX_FIFTY);
			}
		});

		it('should reject unknown properties due to strict mode', () => {
			const result = subscriptionBillingHistoryQuerySchema.safeParse({
				page: 1,
				extraField: 'not-allowed',
			});
			expect(result.success).toBe(false);
		});
	});
});
