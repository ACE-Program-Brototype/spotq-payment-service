import { MESSAGES } from '@shared/constants/message.constants.ts';
import { z } from 'zod';

export const getTransactionDetailParamsSchema = z
	.object({
		id: z.string().uuid({ message: MESSAGES.INVALID_TRANSACTION_ID }),
	})
	.strict();

export type GetTransactionDetailParams = z.infer<typeof getTransactionDetailParamsSchema>;
