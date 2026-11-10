import { MESSAGES } from '@shared/constants/message.constants.ts';
import { DomainError } from './payment.errors.ts';

export class TransactionNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.TRANSACTION_NOT_FOUND) {
		super(message, 'NOT_FOUND');
	}
}

export class ForbiddenAccessError extends DomainError {
	constructor(message: string = MESSAGES.FORBIDDEN_ACCESS) {
		super(message, 'FORBIDDEN');
	}
}

export class InvalidDateRangeError extends DomainError {
	constructor(message: string = MESSAGES.INVALID_DATE_RANGE) {
		super(message, 'BAD_REQUEST');
	}
}
