import { MESSAGES } from '@shared/constants/message.constants.ts';
import { z } from 'zod';

export const getAdminSubscriberDetailsParamsSchema = z
	.object({
		subscriberId: z.string().uuid({ message: MESSAGES.INVALID_SUBSCRIBER_ID }),
	})
	.strict();

export type GetAdminSubscriberDetailsParams = z.infer<typeof getAdminSubscriberDetailsParamsSchema>;
