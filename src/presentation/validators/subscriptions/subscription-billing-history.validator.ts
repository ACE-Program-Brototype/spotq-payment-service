import { MESSAGES } from '@shared/constants/message.constants.ts';
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
			z.coerce.number().int().min(1, { message: MESSAGES.PAGE_MIN_ONE }).default(1),
		),
		limit: z.preprocess(
			emptyStringToUndefined,
			z.coerce
				.number()
				.int()
				.min(1, { message: MESSAGES.LIMIT_MIN_ONE })
				.max(50, { message: MESSAGES.LIMIT_MAX_FIFTY })
				.default(10),
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
