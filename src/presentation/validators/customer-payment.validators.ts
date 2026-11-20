import { PAGINATION, PAYMENT_SORT_FIELDS, SORT_DIRECTIONS } from '@shared/constants/index.ts';
import { z } from 'zod';
import { dateSchema } from './common/date.validators.ts';

export const getCustomerPaymentHistorySchema = z.object({
	page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
	limit: z.coerce
		.number()
		.int()
		.positive()
		.max(PAGINATION.MAX_LIMIT)
		.default(PAGINATION.DEFAULT_LIMIT),
	status: z.enum(['ALL', 'CAPTURED', 'FAILED', 'REFUNDED']).optional(),
	startDate: dateSchema.optional(),
	endDate: dateSchema.optional(),
	sortBy: z
		.enum([PAYMENT_SORT_FIELDS.CREATED_AT, PAYMENT_SORT_FIELDS.AMOUNT_PAISE])
		.default(PAYMENT_SORT_FIELDS.CREATED_AT),
	sortOrder: z.enum([SORT_DIRECTIONS.ASC, SORT_DIRECTIONS.DESC]).default(SORT_DIRECTIONS.DESC),
});

export const customerTransactionIdParamsSchema = z.object({
	id: z.uuid({ message: 'Transaction ID must be a valid UUID' }),
});

export const retryCustomerPaymentParamsSchema = customerTransactionIdParamsSchema;

export type GetCustomerPaymentHistoryQueryParams = z.infer<typeof getCustomerPaymentHistorySchema>;
export type CustomerTransactionIdParams = z.infer<typeof customerTransactionIdParamsSchema>;
export type RetryCustomerPaymentParams = z.infer<typeof retryCustomerPaymentParamsSchema>;
