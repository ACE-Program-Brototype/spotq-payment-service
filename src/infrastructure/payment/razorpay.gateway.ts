import crypto from 'node:crypto';
import { config } from '@config/index.ts';
import {
	type CreateOrderParams,
	type CreateRefundParams,
	type IPaymentGateway,
	type PaymentDetailsResult,
	PaymentGatewayUnavailableError,
	type PaymentOrderResult,
	type PaymentRefundResult,
	type VerifyPaymentSignatureParams,
} from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { DEFAULT_REFUND_SPEED, HttpStatusCode, MESSAGES } from '@shared/constants/index.ts';
import {
	RAZORPAY_CIRCUIT_BREAKER,
	RAZORPAY_ERROR_CODES,
} from '@shared/constants/payment.constants.ts';
import {
	CircuitBreaker,
	CircuitBreakerOpenError,
	type CircuitBreakerOptions,
	CircuitBreakerTimeoutError,
} from '@spotq-org/circuit-breaker';
import { injectable } from 'inversify';
import Razorpay from 'razorpay';
import { setRazorpayClient } from './razorpay.client.ts';

type RazorpayOrderPayload = {
	amount: number;
	currency: string;
	receipt?: string;
	notes?: Record<string, string>;
};

type RazorpayRawOrder = {
	id: string;
	amount: string | number;
	currency: string;
	status: string;
	receipt?: string | null;
};

type RazorpayRawPayment = PaymentDetailsResult;

type RazorpayRefundPayload = {
	amount: number;
	speed?: string;
	notes?: Record<string, string>;
};

type RazorpayRawRefund = {
	id: string;
	payment_id: string;
	amount: string | number;
	currency: string;
	status: string;
	arn?: string;
};

@injectable()
export class RazorpayGateway implements IPaymentGateway {
	private client: Razorpay | null = null;
	private initialized = false;
	private ordersBreaker: CircuitBreaker<[RazorpayOrderPayload], RazorpayRawOrder> | null = null;
	private paymentsBreaker: CircuitBreaker<[string], RazorpayRawPayment> | null = null;
	private refundsBreaker: CircuitBreaker<
		[string, RazorpayRefundPayload],
		RazorpayRawRefund
	> | null = null;

	async initialize(): Promise<void> {
		try {
			const { keyId, keySecret } = config.razorpay;

			if (!keyId || !keySecret) {
				throw new Error(MESSAGES.RAZORPAY_CONFIG_MISSING);
			}

			if (keyId.trim().length === 0 || keySecret.trim().length === 0) {
				throw new Error(MESSAGES.RAZORPAY_CREDS_EMPTY);
			}

			this.client = new Razorpay({
				key_id: keyId,
				key_secret: keySecret,
			});

			this.setupCircuitBreakers();

			setRazorpayClient(this.client);
			this.initialized = true;

			logger.info(MESSAGES.RAZORPAY_INITIALIZED);
		} catch (error) {
			logger.error({ err: error }, MESSAGES.RAZORPAY_INITIALIZATION_FAILED);
			this.initialized = false;
			throw error;
		}
	}

	private createBreakerOptions<TArgs extends unknown[], TReturn>(
		name: string,
		messages: { open: string; halfOpen: string; close: string },
	): CircuitBreakerOptions<TArgs, TReturn> {
		const cbConfig = config.razorpay.circuitBreaker;
		return {
			name,
			timeoutMs: cbConfig.timeoutMs,
			errorThresholdPercentage: cbConfig.errorThresholdPercent,
			resetTimeoutMs: cbConfig.resetTimeoutMs,
			volumeThreshold: cbConfig.volumeThreshold,
			checkIsFailure: (err: unknown, ..._args: TArgs) => this.isGatewayFailure(err),
			onOpen: () => {
				logger.warn({ breaker: name, state: 'OPEN' }, messages.open);
			},
			onHalfOpen: () => {
				logger.info({ breaker: name, state: 'HALF_OPEN' }, messages.halfOpen);
			},
			onClose: () => {
				logger.info({ breaker: name, state: 'CLOSED' }, messages.close);
			},
		};
	}

	private setupCircuitBreakers(): void {
		const client = this.client;
		if (!client) {
			return;
		}

		this.shutdown();

		this.ordersBreaker = new CircuitBreaker(
			async (orderParams: RazorpayOrderPayload) => {
				return (await client.orders.create(orderParams)) as RazorpayRawOrder;
			},
			this.createBreakerOptions(RAZORPAY_CIRCUIT_BREAKER.ORDERS_BREAKER_NAME, {
				open: MESSAGES.RAZORPAY_ORDERS_CB_OPEN,
				halfOpen: MESSAGES.RAZORPAY_ORDERS_CB_HALF_OPEN,
				close: MESSAGES.RAZORPAY_ORDERS_CB_CLOSED,
			}),
		);

		this.paymentsBreaker = new CircuitBreaker(
			async (paymentId: string) => {
				return (await client.payments.fetch(paymentId)) as unknown as RazorpayRawPayment;
			},
			this.createBreakerOptions(RAZORPAY_CIRCUIT_BREAKER.PAYMENTS_BREAKER_NAME, {
				open: MESSAGES.RAZORPAY_PAYMENTS_CB_OPEN,
				halfOpen: MESSAGES.RAZORPAY_PAYMENTS_CB_HALF_OPEN,
				close: MESSAGES.RAZORPAY_PAYMENTS_CB_CLOSED,
			}),
		);

		this.refundsBreaker = new CircuitBreaker(
			async (paymentId: string, refundParams: RazorpayRefundPayload) => {
				return (await client.payments.refund(
					paymentId,
					refundParams,
				)) as unknown as RazorpayRawRefund;
			},
			this.createBreakerOptions(RAZORPAY_CIRCUIT_BREAKER.REFUNDS_BREAKER_NAME, {
				open: MESSAGES.RAZORPAY_REFUNDS_CB_OPEN,
				halfOpen: MESSAGES.RAZORPAY_REFUNDS_CB_HALF_OPEN,
				close: MESSAGES.RAZORPAY_REFUNDS_CB_CLOSED,
			}),
		);
	}

	private isGatewayFailure(error: unknown): boolean {
		if (typeof error === 'object' && error !== null) {
			const err = error as { statusCode?: number; error?: { code?: string } };

			if (
				typeof err.statusCode === 'number' &&
				err.statusCode >= HttpStatusCode.BAD_REQUEST &&
				err.statusCode < HttpStatusCode.INTERNAL_SERVER_ERROR
			) {
				return false;
			}

			if (err.error?.code === RAZORPAY_ERROR_CODES.BAD_REQUEST_ERROR) {
				return false;
			}
		}

		return true;
	}

	isHealthy(): boolean {
		if (!this.initialized || !this.client) {
			return false;
		}

		const { keyId, keySecret } = config.razorpay;
		const hasValidCredentials = !!(
			keyId &&
			keySecret &&
			keyId.trim().length > 0 &&
			keySecret.trim().length > 0
		);

		if (!hasValidCredentials) {
			return false;
		}

		if (this.ordersBreaker?.isOpen || this.paymentsBreaker?.isOpen || this.refundsBreaker?.isOpen) {
			return false;
		}

		return true;
	}

	async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
		if (!this.client || !this.ordersBreaker) {
			throw new Error(MESSAGES.RAZORPAY_CLIENT_NOT_INITIALIZED);
		}

		try {
			const order = await this.ordersBreaker.execute({
				amount: params.amountInPaise,
				currency: params.currency,
				receipt: params.receiptId,
				notes: params.notes,
			});

			return {
				orderId: order.id,
				amount: Number(order.amount),
				currency: order.currency,
				status: order.status,
				receipt: order.receipt ?? undefined,
			};
		} catch (error) {
			if (error instanceof CircuitBreakerOpenError || error instanceof CircuitBreakerTimeoutError) {
				logger.warn({ err: error }, MESSAGES.FAST_FAIL_ORDER_CREATION_CB_OPEN);
				throw new PaymentGatewayUnavailableError();
			}
			throw error;
		}
	}

	verifyPaymentSignature(params: VerifyPaymentSignatureParams): boolean {
		const { keySecret } = config.razorpay;
		if (!keySecret || !params.signature) {
			return false;
		}

		try {
			const body = `${params.orderId}|${params.paymentId}`;
			const expectedSignature = crypto.createHmac('sha256', keySecret).update(body).digest('hex');

			const expectedBuf = Buffer.from(expectedSignature, 'utf8');
			const actualBuf = Buffer.from(params.signature, 'utf8');

			if (expectedBuf.length !== actualBuf.length) {
				return false;
			}

			return crypto.timingSafeEqual(expectedBuf, actualBuf);
		} catch {
			return false;
		}
	}

	verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
		if (!webhookSecret || !signature || !rawBody) {
			return false;
		}

		try {
			const expectedSignature = crypto
				.createHmac('sha256', webhookSecret)
				.update(rawBody)
				.digest('hex');

			const expectedBuf = Buffer.from(expectedSignature, 'utf8');
			const actualBuf = Buffer.from(signature, 'utf8');

			if (expectedBuf.length !== actualBuf.length) {
				return false;
			}

			return crypto.timingSafeEqual(expectedBuf, actualBuf);
		} catch {
			return false;
		}
	}

	async getPaymentDetails(paymentId: string): Promise<PaymentDetailsResult> {
		if (!this.client || !this.paymentsBreaker) {
			throw new Error(MESSAGES.RAZORPAY_CLIENT_NOT_INITIALIZED);
		}

		try {
			const payment = await this.paymentsBreaker.execute(paymentId);
			return payment as unknown as PaymentDetailsResult;
		} catch (error) {
			if (error instanceof CircuitBreakerOpenError || error instanceof CircuitBreakerTimeoutError) {
				logger.warn({ err: error, paymentId }, MESSAGES.FAST_FAIL_PAYMENT_FETCH_CB_OPEN);
				throw new PaymentGatewayUnavailableError();
			}
			throw error;
		}
	}

	async createRefund(params: CreateRefundParams): Promise<PaymentRefundResult> {
		if (!this.client || !this.refundsBreaker) {
			throw new Error(MESSAGES.RAZORPAY_CLIENT_NOT_INITIALIZED);
		}

		try {
			const refund = await this.refundsBreaker.execute(params.paymentId, {
				amount: params.amountInPaise,
				speed: params.speed ?? DEFAULT_REFUND_SPEED,
				notes: params.notes,
			});

			return {
				refundId: refund.id,
				paymentId: refund.payment_id,
				amount: Number(refund.amount),
				currency: refund.currency,
				status: refund.status,
				arn: refund.arn,
			};
		} catch (error) {
			if (error instanceof CircuitBreakerOpenError || error instanceof CircuitBreakerTimeoutError) {
				logger.warn({ err: error, paymentId: params.paymentId }, MESSAGES.FAST_FAIL_REFUND_CB_OPEN);
				throw new PaymentGatewayUnavailableError();
			}
			throw error;
		}
	}

	shutdown(): void {
		this.ordersBreaker?.shutdown();
		this.paymentsBreaker?.shutdown();
		this.refundsBreaker?.shutdown();
		this.ordersBreaker = null;
		this.paymentsBreaker = null;
		this.refundsBreaker = null;
	}
}
