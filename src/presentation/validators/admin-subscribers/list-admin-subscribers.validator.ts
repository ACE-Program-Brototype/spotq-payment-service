import { emptyToUndefined } from '@presentation/utils/query.utils.ts';
import { z } from 'zod';

export const listAdminSubscribersQuerySchema = z
	.object({
		page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
		limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).default(10)),
		status: z.preprocess(
			emptyToUndefined,
			z.enum(['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED', 'PAST_DUE', 'ALL']).optional(),
		),
		search: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
		sortBy: z.preprocess(
			emptyToUndefined,
			z
				.enum(['createdAt', 'currentPeriodEnd', 'currentPeriodStart', 'status'])
				.default('createdAt'),
		),
		sortOrder: z.preprocess(emptyToUndefined, z.enum(['asc', 'desc']).default('desc')),
	})
	.strict();

export type ListAdminSubscribersQuery = z.infer<typeof listAdminSubscribersQuerySchema>;
