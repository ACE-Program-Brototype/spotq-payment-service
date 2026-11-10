import { MESSAGES } from '@shared/constants/message.constants.ts';
import { DomainError } from './payment.errors.ts';

export class RestaurantIdNotFound extends DomainError {
	constructor(message: string = MESSAGES.RESTAURANT_ID_NOT_FOUND) {
		super(message, 'RESTAURANT_ID_NOT_FOUND');
	}
}

export class RestaurantWalletNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.RESTAURANT_WALLET_NOT_FOUND) {
		super(message, 'RESTAURANT_WALLET_NOT_FOUND');
	}
}

export class WalletWithdrawalLockedError extends DomainError {
	constructor(message: string = MESSAGES.WALLET_WITHDRAWAL_LOCKED) {
		super(message, 'WALLET_WITHDRAWAL_LOCKED');
	}
}

export class WalletBankAccountRequiredError extends DomainError {
	constructor(message: string = MESSAGES.WALLET_WITHDRAWAL_BANK_REQUIRED) {
		super(message, 'WALLET_WITHDRAWAL_BANK_REQUIRED');
	}
}

export class WalletInsufficientBalanceError extends DomainError {
	constructor(message: string = MESSAGES.WALLET_INSUFFICIENT_BALANCE) {
		super(message, 'WALLET_INSUFFICIENT_BALANCE');
	}
}

export class WalletT1BalanceUnavailableError extends DomainError {
	constructor(message: string = MESSAGES.WALLET_T1_BALANCE_UNAVAILABLE) {
		super(message, 'WALLET_T1_BALANCE_UNAVAILABLE');
	}
}

export class InvalidBankAccountDetailsError extends DomainError {
	constructor(message: string = MESSAGES.INVALID_BANK_ACCOUNT_DETAILS) {
		super(message, 'BAD_REQUEST');
	}
}
