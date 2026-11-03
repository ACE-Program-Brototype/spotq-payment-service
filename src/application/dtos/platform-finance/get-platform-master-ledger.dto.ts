import type { PlatformLedgerTransactionType } from '@domain/constants/platform-ledger-transaction.constants';

export interface GetPlatformMasterLedgerInputDTO {
	page?: number;
	limit?: number;
	search?: string;
	type?: PlatformLedgerTransactionType;
	restaurantId?: string;
	startDate?: string;
	endDate?: string;
}

export interface GetPlatformMasterLedgerOutputDTO {
	entries: Array<{
		id: string;
		type: string;
		amountPaise: string;
		runningBalancePaise: string;
		restaurantId: string | null;
		referenceId: string | null;
		createdAt: string;
	}>;
	pagination: { page: number; totalPages: number; limit: number } | null;
}
