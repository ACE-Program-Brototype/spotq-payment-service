import { PLATFORM_LEDGER_TRANSACTION_TYPES } from '@domain/constants/platform-ledger-transaction.constants';
import { emptyToUndefined } from '@presentation/utils/query.utils.ts';
import { z } from 'zod';
import { dateSchema } from '../common/date.validators.ts';

export const getPlatformMasterLedgerQuerySchema = z
	.object({
		search: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
		type: z.preprocess(emptyToUndefined, z.enum(PLATFORM_LEDGER_TRANSACTION_TYPES).optional()),
		restaurantId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
		startDate: z.preprocess(emptyToUndefined, dateSchema.optional()),
		endDate: z.preprocess(emptyToUndefined, dateSchema.optional()),
		page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
		limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).default(10)),
	})
	.refine(({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate, {
		message: 'startDate must be on or before endDate',
		path: ['endDate'],
	});

export type GetPlatformMasterLedgerQuery = z.infer<typeof getPlatformMasterLedgerQuerySchema>;
