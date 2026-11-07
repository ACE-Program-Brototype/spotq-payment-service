import {
	InvalidBankAccountDetailsError,
	WalletBankAccountRequiredError,
	WalletInsufficientBalanceError,
	WalletT1BalanceUnavailableError,
	WalletWithdrawalLockedError,
} from '@domain/errors/restaurant.errors.ts';
import { MESSAGES } from '@shared/constants/message.constants.ts';
import { DEFAULT_CURRENCY } from '@shared/constants/payment.constants.ts';
import { BANK_ACCOUNT_NUMBER_REGEX } from '@shared/constants/regex.constants.ts';

export interface RestaurantWalletProps {
	id: string;
	restaurantId: string;
	balancePaise: bigint;
	currency: string;
	isLocked: boolean;
	razorpayFundAccountId?: string | null;
	razorpayContactId?: string | null;
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
			razorpayContactId: null,
			bankName: null,
			bankAccountLast4: null,
			createdAt: now,
			updatedAt: now,
		});
	}

	linkBankAccount(
		bankName: string,
		accountNumber: string,
		razorpayContactId: string,
		razorpayFundAccountId: string,
	): void {
		const normalizedBankName = bankName.trim();

		if (!normalizedBankName) {
			throw new InvalidBankAccountDetailsError(MESSAGES.BANK_NAME_REQUIRED);
		}
		if (!BANK_ACCOUNT_NUMBER_REGEX.test(accountNumber)) {
			throw new InvalidBankAccountDetailsError(MESSAGES.INVALID_BANK_ACCOUNT_NUMBER);
		}

		this.props.bankName = normalizedBankName;
		this.props.bankAccountLast4 = accountNumber.slice(-4);
		this.props.razorpayContactId = razorpayContactId;
		this.props.razorpayFundAccountId = razorpayFundAccountId;

		this.props.updatedAt = new Date();
	}

	assertCanWithdraw(amountPaise: bigint, todayNetEarningsPaise: bigint): void {
		if (this.props.isLocked) throw new WalletWithdrawalLockedError();
		if (!this.props.razorpayFundAccountId) throw new WalletBankAccountRequiredError();
		if (this.props.balancePaise < amountPaise) throw new WalletInsufficientBalanceError();

		const withdrawableBalance =
			this.props.balancePaise > todayNetEarningsPaise
				? this.props.balancePaise - todayNetEarningsPaise
				: 0n;
		if (amountPaise > withdrawableBalance) throw new WalletT1BalanceUnavailableError();
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

	get razorpayContactId(): string | null {
		return this.props.razorpayContactId ?? null;
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
