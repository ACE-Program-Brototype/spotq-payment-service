import { MESSAGES, SUBSCRIPTION_BILLING_HISTORY_PAGINATION } from '@shared/constants/index.ts';
import { z } from 'zod';

const emptyStringToUndefined = (val: unknown): unknown =>
	typeof val === 'string' && val.trim() === '' ? undefined : val;

export const subscriptionBillingHistoryParamsSchema = z
	.object({
		restaurantId: z.string().uuid({ message: MESSAGES.INVALID_RESTAURANT_ID }),
	})
	.strict();

export const subscriptionBillingHistoryQuerySchema = z
	.object({
		page: z.preprocess(
			emptyStringToUndefined,
			z.coerce
				.number()
				.int()
				.min(1, { message: MESSAGES.PAGE_MIN_ONE })
				.default(SUBSCRIPTION_BILLING_HISTORY_PAGINATION.DEFAULT_PAGE),
		),
		limit: z.preprocess(
			emptyStringToUndefined,
			z.coerce
				.number()
				.int()
				.min(1, { message: MESSAGES.LIMIT_MIN_ONE })
				.max(SUBSCRIPTION_BILLING_HISTORY_PAGINATION.MAX_LIMIT, {
					message: MESSAGES.LIMIT_MAX_FIFTY,
				})
				.default(SUBSCRIPTION_BILLING_HISTORY_PAGINATION.DEFAULT_LIMIT),
		),
		status: z.preprocess(
			emptyStringToUndefined,
			z
				.enum(['SUCCESS', 'FAILED', 'CREATED'], {
					message: MESSAGES.INVALID_STATUS_FILTER,
				})
				.optional(),
		),
	})
	.strict();

export type SubscriptionBillingHistoryParamsDTO = z.infer<
	typeof subscriptionBillingHistoryParamsSchema
>;
export type SubscriptionBillingHistoryQueryDTO = z.infer<
	typeof subscriptionBillingHistoryQuerySchema
>;
