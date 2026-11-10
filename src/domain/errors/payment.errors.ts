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

export class SubscriptionNotFoundError extends DomainError {
	constructor(message: string = MESSAGES.SUBSCRIPTION_NOT_FOUND) {
		super(message, 'SUBSCRIPTION_NOT_FOUND');
	}
}

export class SubscriptionNotEligibleForRenewalError extends DomainError {
	constructor(message: string = MESSAGES.SUBSCRIPTION_NOT_ELIGIBLE_FOR_RENEWAL) {
		super(message, 'SUBSCRIPTION_NOT_ELIGIBLE_FOR_RENEWAL');
	}
}

export class ForbiddenSubscriptionAccessError extends DomainError {
	constructor(message: string = MESSAGES.FORBIDDEN_SUBSCRIPTION_ACCESS) {
		super(message, 'FORBIDDEN_SUBSCRIPTION_ACCESS');
	}
}

export class PaymentGatewayUnavailableError extends DomainError {
	constructor(message: string = MESSAGES.PAYMENT_GATEWAY_UNAVAILABLE) {
		super(message, 'PAYMENT_GATEWAY_UNAVAILABLE');
	}
}

export class MissingIdempotencyKeyError extends DomainError {
	constructor(message: string = MESSAGES.MISSING_IDEMPOTENCY_KEY) {
		super(message, 'MISSING_IDEMPOTENCY_KEY');
	}
}

export class IdempotencyKeyPayloadMismatchError extends DomainError {
	constructor(message: string = MESSAGES.IDEMPOTENCY_KEY_PAYLOAD_MISMATCH) {
		super(message, 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
	}
}

export class IdempotencyRequestInProgressError extends DomainError {
	constructor(message: string = MESSAGES.IDEMPOTENCY_REQUEST_IN_PROGRESS) {
		super(message, 'IDEMPOTENCY_REQUEST_IN_PROGRESS');
	}
}

export class IdempotencyStorageUnavailableError extends DomainError {
	constructor(message: string = MESSAGES.IDEMPOTENCY_STORAGE_UNAVAILABLE) {
		super(message, 'IDEMPOTENCY_STORAGE_UNAVAILABLE');
	}
}

export class RenewalAlreadyInProgressError extends DomainError {
	constructor(message: string = MESSAGES.RENEWAL_ALREADY_IN_PROGRESS) {
		super(message, 'RENEWAL_ALREADY_IN_PROGRESS');
	}
}
