import {
	SortDirection,
	TransactionPaymentMethod,
	TransactionQueryStatus,
	TransactionSortField,
} from '@domain/enums/transaction.enums.ts';
import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const listTransactionsQuerySchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		search: z.string().trim().optional(),
		status: z
			.enum([
				TransactionQueryStatus.ALL,
				TransactionQueryStatus.SUCCESS,
				TransactionQueryStatus.PENDING,
				TransactionQueryStatus.FAILED,
				TransactionQueryStatus.REFUNDED,
			])
			.default(TransactionQueryStatus.ALL),
		method: z
			.enum([
				TransactionPaymentMethod.ALL,
				TransactionPaymentMethod.UPI,
				TransactionPaymentMethod.CARD,
				TransactionPaymentMethod.NETBANKING,
			])
			.default(TransactionPaymentMethod.ALL),
		startDate: z
			.string()
			.regex(DATE_REGEX, { message: 'startDate must be in YYYY-MM-DD format' })
			.optional(),
		endDate: z
			.string()
			.regex(DATE_REGEX, { message: 'endDate must be in YYYY-MM-DD format' })
			.optional(),
		minAmount: z.coerce.number().int().min(0).optional(),
		maxAmount: z.coerce.number().int().min(0).optional(),
		sortBy: z
			.enum([TransactionSortField.CREATED_AT, TransactionSortField.AMOUNT_PAISE])
			.default(TransactionSortField.CREATED_AT),
		sortOrder: z.enum([SortDirection.ASC, SortDirection.DESC]).default(SortDirection.DESC),
	})
	.strict()
	.refine(
		(data) => {
			if (data.startDate && data.endDate) {
				return new Date(data.startDate) <= new Date(data.endDate);
			}
			return true;
		},
		{
			message: 'Invalid date range: startDate cannot be after endDate',
			path: ['startDate'],
		},
	);

export type ListTransactionsQueryInput = z.infer<typeof listTransactionsQuerySchema>;
