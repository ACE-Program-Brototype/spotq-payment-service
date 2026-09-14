export interface BillingInvoiceProps {
	id: string;
	restaurantId: string;
	subscriptionId?: string | null;
	paymentTransactionId?: string | null;
	invoiceNumber: string;
	amountPaise: number;
	currency: string;
	status: 'DRAFT' | 'PAID' | 'VOID';
	createdAt: Date;
	updatedAt: Date;
	paidAt?: Date | null;
}

export class BillingInvoice {
	private readonly props: BillingInvoiceProps;

	constructor(props: BillingInvoiceProps) {
		this.props = props;
	}

	get id(): string {
		return this.props.id;
	}

	get restaurantId(): string {
		return this.props.restaurantId;
	}

	get subscriptionId(): string | null | undefined {
		return this.props.subscriptionId;
	}

	get paymentTransactionId(): string | null | undefined {
		return this.props.paymentTransactionId;
	}

	get invoiceNumber(): string {
		return this.props.invoiceNumber;
	}

	get amountPaise(): number {
		return this.props.amountPaise;
	}

	get currency(): string {
		return this.props.currency;
	}

	get status(): 'DRAFT' | 'PAID' | 'VOID' {
		return this.props.status;
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}

	get updatedAt(): Date {
		return this.props.updatedAt;
	}

	get paidAt(): Date | null | undefined {
		return this.props.paidAt;
	}

	toJSON(): Record<string, unknown> {
		return {
			id: this.id,
			restaurantId: this.restaurantId,
			subscriptionId: this.subscriptionId,
			paymentTransactionId: this.paymentTransactionId,
			invoiceNumber: this.invoiceNumber,
			amountPaise: this.amountPaise,
			currency: this.currency,
			status: this.status,
			createdAt: this.createdAt.toISOString(),
			updatedAt: this.updatedAt.toISOString(),
			paidAt: this.paidAt ? this.paidAt.toISOString() : null,
		};
	}
}
