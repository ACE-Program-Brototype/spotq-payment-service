import { DEFAULT_PAYMENT_METHOD, PAYMENT_STATUS } from '@shared/constants/index.ts';
import {
	CustomerUnauthorizedError,
	InvalidPaymentStateTransitionError,
	PaymentOrderNotFoundError,
} from '../errors/payment.errors.ts';

export type PaymentStatus = 'CREATED' | 'CAPTURED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentTransactionProps {
	id: string;
	restaurantId: string;
	subscriptionId?: string | null;
	planId?: string | null;
	orderId?: string | null;
	customerId?: string | null;
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

	get subscriptionId(): string | null {
		return this.props.subscriptionId ?? null;
	}

	get planId(): string | null {
		return this.props.planId ?? null;
	}

	get orderId(): string | null {
		return this.props.orderId ?? null;
	}

	get customerId(): string | null {
		return this.props.customerId ?? null;
	}

	get razorpayOrderId(): string {
		return this.props.razorpayOrderId;
	}

	get razorpayPaymentId(): string | null {
		return this.props.razorpayPaymentId ?? null;
	}

	get razorpaySignature(): string | null {
		return this.props.razorpaySignature ?? null;
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

	get failureReason(): string | null {
		return this.props.failureReason ?? null;
	}

	get metadata(): Record<string, unknown> | null {
		return this.props.metadata ?? null;
	}

	get paymentMethod(): string | null {
		const metadata = this.props.metadata as Record<string, unknown> | null | undefined;
		if (typeof metadata?.method === 'string') {
			return metadata.method;
		}
		return this.props.status === PAYMENT_STATUS.CAPTURED ? DEFAULT_PAYMENT_METHOD : null;
	}

	get createdAt(): Date | undefined {
		return this.props.createdAt;
	}

	get updatedAt(): Date | undefined {
		return this.props.updatedAt;
	}

	isOwnedBy(customerId: string): boolean {
		if (!this.props.customerId) {
			return true;
		}
		return this.props.customerId === customerId;
	}

	assertOwnership(customerId?: string): void {
		if (this.props.customerId) {
			if (!customerId || !this.isOwnedBy(customerId)) {
				throw new CustomerUnauthorizedError();
			}
		}
	}

	belongsToOrder(orderId: string): boolean {
		return this.props.orderId === orderId;
	}

	assertBelongsToOrder(orderId: string): void {
		if (!this.belongsToOrder(orderId)) {
			throw new PaymentOrderNotFoundError();
		}
	}

	capture(params: {
		paymentId?: string | null;
		signature?: string | null;
		metadata?: Record<string, unknown>;
	}): void {
		if (this.props.status === PAYMENT_STATUS.CAPTURED) {
			return;
		}
		if (this.props.status === PAYMENT_STATUS.FAILED) {
			throw new InvalidPaymentStateTransitionError();
		}
		this.props.status = PAYMENT_STATUS.CAPTURED;
		if (params.paymentId !== undefined && params.paymentId !== null) {
			this.props.razorpayPaymentId = params.paymentId;
		}
		if (params.signature !== undefined) {
			this.props.razorpaySignature = params.signature;
		}
		if (params.metadata) {
			this.props.metadata = {
				...((this.props.metadata as Record<string, unknown> | undefined) || {}),
				...params.metadata,
			};
		}
		this.props.updatedAt = new Date();
	}

	markFailed(reason: string): void {
		if (
			this.props.status === PAYMENT_STATUS.CAPTURED ||
			this.props.status === PAYMENT_STATUS.SUCCESS
		) {
			return;
		}
		this.props.status = PAYMENT_STATUS.FAILED;
		this.props.failureReason = reason;
		this.props.updatedAt = new Date();
	}

	toJSON() {
		return {
			id: this.id,
			restaurantId: this.restaurantId,
			subscriptionId: this.subscriptionId,
			planId: this.planId,
			orderId: this.orderId,
			customerId: this.customerId,
			razorpayOrderId: this.razorpayOrderId,
			razorpayPaymentId: this.razorpayPaymentId,
			amountPaise: this.amountPaise,
			amountInRupees: this.amountPaise / 100,
			currency: this.currency,
			status: this.status,
			failureReason: this.failureReason,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
		};
	}
}
