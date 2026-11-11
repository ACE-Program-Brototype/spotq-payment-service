import type {
	ListWalletLedgerEntriesOutputDTO,
	WalletLedgerEntryDTO,
} from '@application/dtos/restaurant-wallet/list-wallet-ledger-entries.dto.ts';
import type { PaginatedWalletLedgerEntries } from '@domain/repositories/restaurant-wallet.repository.interface.ts';

export const ListWalletLedgerEntriesMapper = {
	toDto(
		result: PaginatedWalletLedgerEntries,
		page: number,
		limit: number,
	): ListWalletLedgerEntriesOutputDTO {
		const entries: WalletLedgerEntryDTO[] = result.entries.map((entry) => ({
			id: entry.id,
			type: entry.type,
			status: entry.status,
			amountPaise: Number(entry.amountPaise),
			balanceBeforePaise: Number(entry.balanceBefore),
			balanceAfterPaise: Number(entry.balanceAfter),
			referenceId: entry.referenceId,
			utrNumber: entry.utrNumber,
			createdAt: entry.createdAt.toISOString(),
		}));

		return {
			entries,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(result.totalRecords / limit),
				totalRecords: result.totalRecords,
				limit,
			},
		};
	},
};
