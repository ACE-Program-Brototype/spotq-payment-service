import type { RefundStatus } from '@shared/constants/index.ts';

export type { RefundStatus };

export interface PaymentRefundProps {
	id: string;
	paymentTransactionId: string;
	razorpayRefundId: string;
	amountPaise: number;
	currency: string;
	status: RefundStatus;
	reason?: string | null;
	arn?: string | null;
	paymentMethod?: string | null;
	destination?: string | null;
	createdAt?: Date;
	processedAt?: Date | null;
}

export class PaymentRefund {
	constructor(private readonly props: PaymentRefundProps) {}

	get id(): string {
		return this.props.id;
	}

	get paymentTransactionId(): string {
		return this.props.paymentTransactionId;
	}

	get razorpayRefundId(): string {
		return this.props.razorpayRefundId;
	}

	get amountPaise(): number {
		return this.props.amountPaise;
	}

	get amountInRupees(): number {
		return this.props.amountPaise / 100;
	}

	get currency(): string {
		return this.props.currency;
	}

	get status(): RefundStatus {
		return this.props.status;
	}

	get reason(): string | null {
		return this.props.reason ?? null;
	}

	get arn(): string | null {
		return this.props.arn ?? null;
	}

	get paymentMethod(): string | null {
		return this.props.paymentMethod ?? null;
	}

	get destination(): string | null {
		return this.props.destination ?? null;
	}

	get createdAt(): Date | undefined {
		return this.props.createdAt;
	}

	get processedAt(): Date | null | undefined {
		return this.props.processedAt;
	}
}
