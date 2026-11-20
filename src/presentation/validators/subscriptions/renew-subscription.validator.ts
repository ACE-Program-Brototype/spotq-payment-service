import { HTTP_HEADERS } from '@shared/constants/http.constants.ts';
import { MESSAGES } from '@shared/constants/message.constants.ts';
import { IDEMPOTENCY_KEY_REGEX } from '@shared/constants/regex.constants.ts';
import {
	IDEMPOTENCY_KEY_MAX_LENGTH,
	IDEMPOTENCY_KEY_MIN_LENGTH,
} from '@shared/constants/subscription.constants.ts';
import { z } from 'zod';

export const renewSubscriptionParamsSchema = z
	.object({
		subscriptionId: z.string().uuid({ message: MESSAGES.INVALID_SUBSCRIPTION_ID }),
	})
	.strict();

export const renewSubscriptionHeadersSchema = z.object({
	[HTTP_HEADERS.IDEMPOTENCY_KEY]: z
		.string({ message: MESSAGES.MISSING_IDEMPOTENCY_KEY })
		.trim()
		.min(IDEMPOTENCY_KEY_MIN_LENGTH, { message: MESSAGES.INVALID_IDEMPOTENCY_KEY })
		.max(IDEMPOTENCY_KEY_MAX_LENGTH, { message: MESSAGES.INVALID_IDEMPOTENCY_KEY })
		.regex(IDEMPOTENCY_KEY_REGEX, { message: MESSAGES.INVALID_IDEMPOTENCY_KEY }),
});

export const renewSubscriptionBodySchema = z
	.object({
		planId: z.string().uuid({ message: MESSAGES.INVALID_PLAN_ID }).optional(),
	})
	.strict();

export type RenewSubscriptionParamsDTO = z.infer<typeof renewSubscriptionParamsSchema>;
export type RenewSubscriptionHeadersDTO = z.infer<typeof renewSubscriptionHeadersSchema>;
export type RenewSubscriptionBodyDTO = z.infer<typeof renewSubscriptionBodySchema>;
