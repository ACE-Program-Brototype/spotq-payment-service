import { InvalidBankAccountDetailsError } from '@domain/errors/restaurant.errors.ts';
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

	linkBankAccount(bankName: string, accountNumber: string, ifsc: string): void {
		const normalizedBankName = bankName.trim();
		const normalizedIfsc = ifsc.trim().toUpperCase();

		if (!normalizedBankName) {
			throw new InvalidBankAccountDetailsError('Bank name is required');
		}
		if (!/^\d{9,18}$/.test(accountNumber)) {
			throw new InvalidBankAccountDetailsError('Account number must contain 9 to 18 digits');
		}
		if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIfsc)) {
			throw new InvalidBankAccountDetailsError('IFSC code is invalid');
		}

		this.props.bankName = normalizedBankName;
		this.props.bankAccountLast4 = accountNumber.slice(-4);
		this.props.updatedAt = new Date();
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
