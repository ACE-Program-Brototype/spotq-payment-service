import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const listTransactionsQuerySchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		search: z.string().trim().optional(),
		status: z.enum(['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED']).default('ALL'),
		method: z.enum(['ALL', 'UPI', 'CARD', 'NETBANKING']).default('ALL'),
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
		sortBy: z.enum(['createdAt', 'amountPaise']).default('createdAt'),
		sortOrder: z.enum(['asc', 'desc']).default('desc'),
	})
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
