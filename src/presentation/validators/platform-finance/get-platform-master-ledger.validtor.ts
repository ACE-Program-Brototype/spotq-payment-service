import { PLATFORM_LEDGER_FILTER_TYPES } from '@application/dtos/platform-finance/get-platform-master-ledger.dto';
import { z } from 'zod';
import { dateSchema } from '../common/date.validators.ts';

export const getPlatformMasterLedgerQuerySchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		search: z.string().trim().min(1).optional(),
		type: z.enum(PLATFORM_LEDGER_FILTER_TYPES).default('ALL'),
		restaurantId: z.string().uuid().optional(),
		startDate: dateSchema.optional(),
		endDate: dateSchema.optional(),
	})
	.refine(({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate, {
		message: 'startDate must be on or before endDate',
		path: ['endDate'],
	})
	.strict();

export type GetPlatformMasterLedgerQuery = z.infer<typeof getPlatformMasterLedgerQuerySchema>;
