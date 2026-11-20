import {
	PlatformLedgerTransaction,
	type PlatformLedgerTransactionProps,
} from '@domain/entities/platform-ledger-transaction.entity.ts';
import type { PlatformLedgerPage } from '@domain/repositories/platform-ledger-transaction.repository.interface.ts';

export const PlatformLedgerTransactionPersistenceMapper = {
	toDomain(record: PlatformLedgerTransactionProps): PlatformLedgerTransaction {
		return new PlatformLedgerTransaction(record);
	},

	toPaginatedDomain(
		records: PlatformLedgerTransactionProps[],
		totalRecords: number,
		page?: number,
		limit?: number,
	): PlatformLedgerPage {
		const pagination =
			limit === undefined
				? null
				: { page: page ?? 1, totalPages: Math.ceil(totalRecords / limit), limit };
		return {
			entries: records.map(PlatformLedgerTransactionPersistenceMapper.toDomain),
			pagination,
		};
	},
};
