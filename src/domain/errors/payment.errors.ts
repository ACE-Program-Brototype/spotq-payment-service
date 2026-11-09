import { MESSAGES } from '@shared/constants/message.constants.ts';
import { PAYMENT_DOMAIN_ERROR_CODES } from '@shared/constants/payment.constants.ts';

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
		super(message, PAYMENT_DOMAIN_ERROR_CODES.PLAN_NOT_FOUND);
	}
}

export class ActiveSubscriptionAlreadyExistsError extends DomainError {
	constructor(message: string = MESSAGES.ACTIVE_SUBSCRIPTION_EXISTS) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.ACTIVE_SUBSCRIPTION_EXISTS);
	}
}

export class PaymentOrderNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.PAYMENT_ORDER_NOT_FOUND) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.PAYMENT_ORDER_NOT_FOUND);
	}
}

export class InvalidPaymentSignatureError extends DomainError {
	constructor(message: string = MESSAGES.INVALID_PAYMENT_SIGNATURE) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.INVALID_PAYMENT_SIGNATURE);
	}
}

export class PaymentAlreadyProcessedError extends DomainError {
	constructor(message: string = MESSAGES.PAYMENT_ALREADY_PROCESSED) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.PAYMENT_ALREADY_PROCESSED);
	}
}

export class UnauthorizedRestaurantError extends DomainError {
	constructor(message: string = MESSAGES.UNAUTHORIZED_RESTAURANT) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.UNAUTHORIZED_RESTAURANT);
	}
}

export class OrderPaymentNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.ORDER_PAYMENT_NOT_FOUND) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.ORDER_PAYMENT_NOT_FOUND);
	}
}

export class CustomerUnauthorizedError extends DomainError {
	constructor(message: string = MESSAGES.CUSTOMER_UNAUTHORIZED) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.CUSTOMER_UNAUTHORIZED);
	}
}

export class OrderPaymentAlreadyCapturedError extends DomainError {
	constructor(message: string = MESSAGES.ORDER_PAYMENT_ALREADY_CAPTURED) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.PAYMENT_ALREADY_PROCESSED);
	}
}

export class InvalidPaymentStateTransitionError extends DomainError {
	constructor(message: string = MESSAGES.CANNOT_CAPTURE_FAILED_PAYMENT) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.INVALID_PAYMENT_STATE_TRANSITION);
	}
}

export class PaymentGatewayError extends DomainError {
	constructor(message: string = MESSAGES.PAYMENT_GATEWAY_ERROR) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.PAYMENT_GATEWAY_ERROR);
	}
}

export class PaymentGatewayRequestNotSentError extends DomainError {
	constructor(message: string = MESSAGES.PAYMENT_GATEWAY_ERROR) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.PAYMENT_GATEWAY_REQUEST_NOT_SENT);
	}
}

export class InvalidBankAccountError extends DomainError {
	constructor(message: string = MESSAGES.INVALID_BANK_ACCOUNT_DETAILS) {
		super(message, PAYMENT_DOMAIN_ERROR_CODES.INVALID_BANK_ACCOUNT);
	}
}
