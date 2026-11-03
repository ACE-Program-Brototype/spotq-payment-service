import type { PlatformLedgerTransaction } from '@domain/entities/platform-ledger-transaction.entity';

export const PlatformLedgerEntryMapper = {
	toDto(entry: PlatformLedgerTransaction) {
		return {
			id: entry.id,
			type: entry.type,
			amountPaise: entry.amountPaise.toString(),
			runningBalancePaise: entry.runningBalancePaise.toString(),
			restaurantId: entry.restaurantId,
			referenceId: entry.referenceId,
			createdAt: entry.createdAt.toISOString(),
		};
	},
};
