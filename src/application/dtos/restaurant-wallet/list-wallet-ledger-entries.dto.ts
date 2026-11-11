import type {
	WalletLedgerStatus,
	WalletLedgerType,
} from '@domain/constants/wallet-ledger.constants.ts';

export interface ListWalletLedgerEntriesInputDTO {
	restaurantId: string;
	page: number;
	limit: number;
	type?: WalletLedgerType | null;
	status?: WalletLedgerStatus | null;
	search?: string | null;
	startDate?: string | null;
	endDate?: string | null;
}

export interface WalletLedgerEntryDTO {
	id: string;
	type: WalletLedgerType;
	status: WalletLedgerStatus;
	amountPaise: number;
	balanceBeforePaise: number;
	balanceAfterPaise: number;
	referenceId: string | null;
	utrNumber: string | null;
	createdAt: string;
}

export interface WalletLedgerPaginationDTO {
	currentPage: number;
	totalPages: number;
	totalRecords: number;
	limit: number;
}

export interface ListWalletLedgerEntriesOutputDTO {
	entries: WalletLedgerEntryDTO[];
	pagination: WalletLedgerPaginationDTO;
}
