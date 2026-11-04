import { MESSAGES } from '@shared/constants/message.constants.ts';
import { DomainError } from './payment.errors.ts';

export class RestaurantWalletNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.RESTAURANT_WALLET_NOT_FOUND) {
		super(message, 'RESTAURANT_WALLET_NOT_FOUND');
	}
}
