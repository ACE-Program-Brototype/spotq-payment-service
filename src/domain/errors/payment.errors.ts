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

export class OrderPaymentNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.ORDER_PAYMENT_NOT_FOUND) {
		super(message, 'ORDER_PAYMENT_NOT_FOUND');
	}
}

export class CustomerUnauthorizedError extends DomainError {
	constructor(message: string = MESSAGES.CUSTOMER_UNAUTHORIZED) {
		super(message, 'CUSTOMER_UNAUTHORIZED');
	}
}

export class OrderPaymentAlreadyCapturedError extends DomainError {
	constructor(message: string = MESSAGES.ORDER_PAYMENT_ALREADY_CAPTURED) {
		super(message, 'PAYMENT_ALREADY_PROCESSED');
	}
}

export class InvalidPaymentStateTransitionError extends DomainError {
	constructor(message: string = MESSAGES.CANNOT_CAPTURE_FAILED_PAYMENT) {
		super(message, 'INVALID_PAYMENT_STATE_TRANSITION');
	}
}

export class AlreadyPaidError extends DomainError {
	constructor(message: string = MESSAGES.ALREADY_PAID) {
		super(message, 'ALREADY_PAID');
	}
}

export class OrderExpiredError extends DomainError {
	constructor(message: string = MESSAGES.ORDER_EXPIRED) {
		super(message, 'ORDER_EXPIRED');
	}
}

export class PaymentNotRetryableError extends DomainError {
	constructor(message: string = MESSAGES.NOT_RETRYABLE) {
		super(message, 'NOT_RETRYABLE');
	}
}

export class TransactionNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.TRANSACTION_NOT_FOUND) {
		super(message, 'NOT_FOUND');
	}
}

export class SubscriberNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.SUBSCRIBER_NOT_FOUND) {
		super(message, 'SUBSCRIBER_NOT_FOUND');
	}
}
