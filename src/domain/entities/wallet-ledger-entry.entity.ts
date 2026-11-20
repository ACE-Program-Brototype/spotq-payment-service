import type {
	WalletLedgerStatus,
	WalletLedgerType,
} from '@domain/constants/wallet-ledger.constants.ts';

export interface WalletLedgerEntryProps {
	id: string;
	walletId: string;
	type: WalletLedgerType;
	status: WalletLedgerStatus;
	amountPaise: bigint;
	balanceBefore: bigint;
	balanceAfter: bigint;
	referenceId: string | null;
	utrNumber: string | null;
	createdAt: Date;
}

export class WalletLedgerEntry {
	constructor(private readonly props: WalletLedgerEntryProps) {}

	get id(): string {
		return this.props.id;
	}

	get walletId(): string {
		return this.props.walletId;
	}

	get type(): WalletLedgerType {
		return this.props.type;
	}

	get status(): WalletLedgerStatus {
		return this.props.status;
	}

	get amountPaise(): bigint {
		return this.props.amountPaise;
	}

	get balanceBefore(): bigint {
		return this.props.balanceBefore;
	}

	get balanceAfter(): bigint {
		return this.props.balanceAfter;
	}

	get referenceId(): string | null {
		return this.props.referenceId;
	}

	get utrNumber(): string | null {
		return this.props.utrNumber;
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}
}
