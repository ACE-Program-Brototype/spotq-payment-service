import type { PaymentStatus } from '@prisma/client';

export interface PaymentTransactionProps {
	id: string;
	restaurantId: string;
	subscriptionId?: string | null;
	planId: string;
	razorpayOrderId: string;
	razorpayPaymentId?: string | null;
	razorpaySignature?: string | null;
	amountPaise: number;
	currency: string;
	status: PaymentStatus;
	failureReason?: string | null;
	metadata?: Record<string, unknown> | null;
	createdAt?: Date;
	updatedAt?: Date;
}

export class PaymentTransaction {
	constructor(private readonly props: PaymentTransactionProps) {}

	get id(): string {
		return this.props.id;
	}

	get restaurantId(): string {
		return this.props.restaurantId;
	}

	get subscriptionId(): string | null | undefined {
		return this.props.subscriptionId;
	}

	get planId(): string {
		return this.props.planId;
	}

	get razorpayOrderId(): string {
		return this.props.razorpayOrderId;
	}

	get razorpayPaymentId(): string | null | undefined {
		return this.props.razorpayPaymentId;
	}

	get razorpaySignature(): string | null | undefined {
		return this.props.razorpaySignature;
	}

	get amountPaise(): number {
		return this.props.amountPaise;
	}

	get currency(): string {
		return this.props.currency;
	}

	get status(): PaymentStatus {
		return this.props.status;
	}

	get failureReason(): string | null | undefined {
		return this.props.failureReason;
	}

	get metadata(): Record<string, unknown> | null | undefined {
		return this.props.metadata;
	}

	toJSON() {
		return {
			id: this.id,
			restaurantId: this.restaurantId,
			subscriptionId: this.subscriptionId,
			planId: this.planId,
			razorpayOrderId: this.razorpayOrderId,
			razorpayPaymentId: this.razorpayPaymentId,
			amountPaise: this.amountPaise,
			amountInRupees: this.amountPaise / 100,
			currency: this.currency,
			status: this.status,
			failureReason: this.failureReason,
		};
	}
}
