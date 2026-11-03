import type { PlatformLedgerTransactionType } from '@domain/constants/platform-ledger-transaction.constants.ts';
import type { PlatformLedgerTransaction } from '@domain/entities/platform-ledger-transaction.entity';

export interface PlatformLedgerQuery {
	page?: number;
	limit?: number;
	search?: string;
	type?: PlatformLedgerTransactionType;
	restaurantId?: string;
	startDate?: string;
	endDate?: string;
}

export interface PlatformLedgerPage {
	entries: PlatformLedgerTransaction[];
	pagination: { page: number; totalPages: number; limit: number } | null;
}

export interface IPlatformLedgerTransactionRepository {
	findManyPaginated(input: PlatformLedgerQuery): Promise<PlatformLedgerPage>;
}
