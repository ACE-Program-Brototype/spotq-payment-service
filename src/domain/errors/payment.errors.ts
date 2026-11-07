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

export class PaymentAlreadyRefundedError extends DomainError {
	constructor(message: string = MESSAGES.PAYMENT_ALREADY_REFUNDED) {
		super(message, 'PAYMENT_ALREADY_REFUNDED');
	}
}

export class CannotRefundUncapturedPaymentError extends DomainError {
	constructor(message: string = MESSAGES.CANNOT_REFUND_UNCAPTURED_PAYMENT) {
		super(message, 'CANNOT_REFUND_UNCAPTURED_PAYMENT');
	}
}

export class RefundAmountExceedsBalanceError extends DomainError {
	constructor(message: string = MESSAGES.REFUND_AMOUNT_EXCEEDS_BALANCE) {
		super(message, 'REFUND_AMOUNT_EXCEEDS_BALANCE');
	}
}

export class RefundAmountInvalidError extends DomainError {
	constructor(message: string = MESSAGES.REFUND_AMOUNT_INVALID) {
		super(message, 'BAD_REQUEST');
	}
}

export class PaymentGatewayError extends DomainError {
	constructor(message: string = MESSAGES.REFUND_GATEWAY_ERROR) {
		super(message, 'REFUND_GATEWAY_ERROR');
	}
}

export class DuplicateRefundRequestError extends DomainError {
	constructor(message: string = MESSAGES.CONFLICT) {
		super(message, 'CONFLICT');
	}
}

export class SubscriberNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.SUBSCRIBER_NOT_FOUND) {
		super(message, 'SUBSCRIBER_NOT_FOUND');
	}
}
