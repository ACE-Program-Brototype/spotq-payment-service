import { PLATFORM_LEDGER_TRANSACTION_TYPES } from '@domain/constants/platform-ledger-transaction.constants';

export const PLATFORM_LEDGER_FILTER_TYPES = {
	ALL: 'ALL',
	...PLATFORM_LEDGER_TRANSACTION_TYPES,
} as const;

export type PlatformLedgerFilterType =
	(typeof PLATFORM_LEDGER_FILTER_TYPES)[keyof typeof PLATFORM_LEDGER_FILTER_TYPES];

export interface GetPlatformMasterLedgerInputDTO {
	page: number;
	limit: number;
	search?: string;
	type?: PlatformLedgerFilterType;
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
	pagination: {
		page: number;
		totalPages: number;
		limit: number;
	};
}
