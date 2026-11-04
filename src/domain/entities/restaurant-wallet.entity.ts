import { DEFAULT_CURRENCY } from '@shared/constants/payment.constants.ts';

export interface RestaurantWalletProps {
	id: string;
	restaurantId: string;
	balancePaise: bigint;
	currency: string;
	isLocked: boolean;
	razorpayFundAccountId?: string | null;
	bankName?: string | null;
	bankAccountLast4?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export class RestaurantWallet {
	constructor(private readonly props: RestaurantWalletProps) {}

	static create(restaurantId: string): RestaurantWallet {
		const now = new Date();

		return new RestaurantWallet({
			id: crypto.randomUUID(),
			restaurantId,
			balancePaise: 0n,
			currency: DEFAULT_CURRENCY,
			isLocked: false,
			razorpayFundAccountId: null,
			bankName: null,
			bankAccountLast4: null,
			createdAt: now,
			updatedAt: now,
		});
	}

	get id(): string {
		return this.props.id;
	}

	get restaurantId(): string {
		return this.props.restaurantId;
	}

	get balancePaise(): bigint {
		return this.props.balancePaise;
	}

	get currency(): string {
		return this.props.currency;
	}

	get isLocked(): boolean {
		return this.props.isLocked;
	}

	get razorpayFundAccountId(): string | null {
		return this.props.razorpayFundAccountId ?? null;
	}

	get bankName(): string | null {
		return this.props.bankName ?? null;
	}

	get bankAccountLast4(): string | null {
		return this.props.bankAccountLast4 ?? null;
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}

	get updatedAt(): Date {
		return this.props.updatedAt;
	}
}
