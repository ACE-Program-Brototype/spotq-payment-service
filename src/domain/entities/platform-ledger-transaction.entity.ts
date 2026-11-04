import type { PlatformLedgerTransactionType } from '@domain/constants/platform-ledger-transaction.constants';

export interface PlatformLedgerTransactionProps {
	id: string;
	type: PlatformLedgerTransactionType;
	platformWalletId: string;
	amountPaise: bigint;
	runningBalancePaise: bigint;
	restaurantId: string | null;
	referenceId: string | null;
	createdAt: Date;
}

export class PlatformLedgerTransaction {
	constructor(private readonly props: PlatformLedgerTransactionProps) {}

	get id(): string {
		return this.props.id;
	}

	get type(): PlatformLedgerTransactionType {
		return this.props.type;
	}

	get amountPaise(): bigint {
		return this.props.amountPaise;
	}

	get runningBalancePaise(): bigint {
		return this.props.runningBalancePaise;
	}

	get restaurantId(): string | null {
		return this.props.restaurantId;
	}

	get platformWalletId(): string {
		return this.props.platformWalletId;
	}

	get referenceId(): string | null {
		return this.props.referenceId;
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}
}
