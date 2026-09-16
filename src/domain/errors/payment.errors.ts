import { MESSAGES } from '@shared/constants/message.constants.ts';

export class DomainError extends Error {
	constructor(
		message: string,
		public readonly code: string,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class PlanNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.PLAN_NOT_FOUND) {
		super(message, 'PLAN_NOT_FOUND');
	}
}

export class ActiveSubscriptionAlreadyExistsError extends DomainError {
	constructor(message: string = MESSAGES.ACTIVE_SUBSCRIPTION_EXISTS) {
		super(message, 'ACTIVE_SUBSCRIPTION_EXISTS');
	}
}

export class PaymentOrderNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.PAYMENT_ORDER_NOT_FOUND) {
		super(message, 'PAYMENT_ORDER_NOT_FOUND');
	}
}

export class InvalidPaymentSignatureError extends DomainError {
	constructor(message: string = MESSAGES.INVALID_PAYMENT_SIGNATURE) {
		super(message, 'INVALID_PAYMENT_SIGNATURE');
	}
}

export class PaymentAlreadyProcessedError extends DomainError {
	constructor(message: string = MESSAGES.PAYMENT_ALREADY_PROCESSED) {
		super(message, 'PAYMENT_ALREADY_PROCESSED');
	}
}

export class UnauthorizedRestaurantError extends DomainError {
	constructor(message: string = MESSAGES.UNAUTHORIZED_RESTAURANT) {
		super(message, 'UNAUTHORIZED_RESTAURANT');
	}
}
