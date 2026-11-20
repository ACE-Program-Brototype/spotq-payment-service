import { PLATFORM_LEDGER_TRANSACTION_TYPES } from '@domain/constants/platform-ledger-transaction.constants';
import { emptyToUndefined } from '@presentation/utils/query.utils.ts';
import { z } from 'zod';
import { dateSchema } from '../common/date.validators.ts';

export const exportPlatformMasterLedgerQuerySchema = z
	.object({
		search: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
		type: z.preprocess(emptyToUndefined, z.enum(PLATFORM_LEDGER_TRANSACTION_TYPES).optional()),
		restaurantId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
		startDate: z.preprocess(emptyToUndefined, dateSchema.optional()),
		endDate: z.preprocess(emptyToUndefined, dateSchema.optional()),
	})
	.refine(({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate, {
		message: 'startDate must be on or before endDate',
		path: ['endDate'],
	});

export type ExportPlatformMasterLedgerQuery = z.infer<typeof exportPlatformMasterLedgerQuerySchema>;
