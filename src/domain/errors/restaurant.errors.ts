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

export class InvalidBankAccountDetailsError extends DomainError {
	constructor(message: string = MESSAGES.INVALID_BANK_ACCOUNT_DETAILS) {
		super(message, 'BAD_REQUEST');
	}
}
