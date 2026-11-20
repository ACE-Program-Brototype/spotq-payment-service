import type { PlatformLedgerTransactionType } from '@domain/constants/platform-ledger-transaction.constants';

export interface ExportPlatformLedgerInputDTO {
	search?: string;
	type?: PlatformLedgerTransactionType;
	restaurantId?: string;
	startDate?: string;
	endDate?: string;
}
