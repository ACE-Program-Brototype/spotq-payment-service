import { WalletLedgerEntry } from '@domain/entities/wallet-ledger-entry.entity.ts';
import type { WalletLedgerEntry as PrismaWalletLedgerEntry } from '@prisma/client';

export const WalletLedgerEntryPersistenceMapper = {
	toDomain(record: PrismaWalletLedgerEntry): WalletLedgerEntry {
		return new WalletLedgerEntry({
			id: record.id,
			walletId: record.walletId,
			type: record.type,
			status: record.status,
			amountPaise: record.amountPaise,
			balanceBefore: record.balanceBefore,
			balanceAfter: record.balanceAfter,
			referenceId: record.referenceId,
			utrNumber: record.utrNumber,
			createdAt: record.createdAt,
		});
	},
};
