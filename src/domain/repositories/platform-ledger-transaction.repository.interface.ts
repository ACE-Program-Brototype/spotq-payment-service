import type {
	PlatformLedgerTransaction,
	PlatformLedgerTransactionType,
} from '../entities/platform-ledger-transaction.entity.ts';

export interface PlatformLedgerQuery {
	page: number;
	limit: number;
	search?: string;
	type?: 'ALL' | PlatformLedgerTransactionType;
	restaurantId?: string;
	startDate?: string;
	endDate?: string;
}

export interface PlatformLedgerPage {
	entries: PlatformLedgerTransaction[];
	pagination: {
		page: number;
		totalPages: number;
		limit: number;
	};
}

export interface IPlatformLedgerTransactionRepository {
	findManyPaginated(input: PlatformLedgerQuery): Promise<PlatformLedgerPage>;
}
