import {
	WALLET_LEDGER_STATUSES,
	WALLET_LEDGER_TYPES,
} from '@domain/constants/wallet-ledger.constants.ts';
import { emptyToUndefined } from '@presentation/utils/query.utils.ts';
import { dateSchema } from '@presentation/validators/common/date.validators.ts';
import { z } from 'zod';

export const listWalletLedgerEntriesQuerySchema = z
	.object({
		page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
		limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
		type: z.preprocess(emptyToUndefined, z.enum(WALLET_LEDGER_TYPES).optional()),
		status: z.preprocess(emptyToUndefined, z.enum(WALLET_LEDGER_STATUSES).optional()),
		search: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
		startDate: z.preprocess(emptyToUndefined, dateSchema.optional()),
		endDate: z.preprocess(emptyToUndefined, dateSchema.optional()),
	})
	.refine(({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate, {
		message: 'startDate must be on or before endDate',
		path: ['endDate'],
	});

export type ListWalletLedgerEntriesQuery = z.infer<typeof listWalletLedgerEntriesQuerySchema>;
