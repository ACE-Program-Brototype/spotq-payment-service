import crypto from 'node:crypto';
import { config } from '@config/index.ts';
import {
	InvalidBankAccountError,
	PaymentGatewayError,
	PaymentGatewayRequestNotSentError,
} from '@domain/errors/payment.errors.ts';
import {
	type CreateOrderParams,
	type CreatePayoutParams,
	type CreateRefundParams,
	type FundAccountDetails,
	type IPaymentGateway,
	type PaymentDetailsResult,
	PaymentGatewayUnavailableError,
	type PaymentOrderResult,
	type PaymentRefundResult,
	type PayoutResult,
	type VerifyPaymentSignatureParams,
} from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	DEFAULT_REFUND_SPEED,
	HttpStatusCode,
	MESSAGES,
	RAZORPAY_CIRCUIT_BREAKER,
	RAZORPAY_ERROR_CODES,
	RAZORPAY_HTTP_METHOD,
	RAZORPAY_X_BASE_URL,
	RAZORPAY_X_PATH,
	type RazorpayHttpMethod,
} from '@shared/constants/index.ts';
import {
	CircuitBreaker,
	CircuitBreakerOpenError,
	type CircuitBreakerOptions,
	CircuitBreakerTimeoutError,
} from '@spotq-org/circuit-breaker';
import axios from 'axios';
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

interface FundAccountDetailsResponse {
	id: string;
	contact_id: string;
	bank_account: {
		name: string;
		account_number: string;
		ifsc: string;
		bank_name: string;
	};
	active: boolean;
}

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
			throw new PaymentGatewayError(MESSAGES.RAZORPAY_CLIENT_NOT_INITIALIZED);
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
			throw new PaymentGatewayError(this.getGatewayErrorMessage(error));
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
			throw new PaymentGatewayError(MESSAGES.RAZORPAY_CLIENT_NOT_INITIALIZED);
		}

		try {
			const payment = await this.paymentsBreaker.execute(paymentId);
			return payment as unknown as PaymentDetailsResult;
		} catch (error) {
			if (error instanceof CircuitBreakerOpenError || error instanceof CircuitBreakerTimeoutError) {
				logger.warn({ err: error, paymentId }, MESSAGES.FAST_FAIL_PAYMENT_FETCH_CB_OPEN);
				throw new PaymentGatewayUnavailableError();
			}
			throw new PaymentGatewayError(this.getGatewayErrorMessage(error));
		}
	}

	private async razorpayXRequest<T>(
		method: RazorpayHttpMethod,
		path: string,
		body?: Record<string, unknown>,
		extraHeaders?: Record<string, string>,
	): Promise<T> {
		const { keyId, keySecret } = config.razorpay;

		if (!keyId || !keySecret) {
			throw new PaymentGatewayError(MESSAGES.RAZORPAY_CONFIG_MISSING);
		}

		try {
			const response = await axios.request<T>({
				method,
				url: `${RAZORPAY_X_BASE_URL}${path}`,
				auth: {
					username: keyId,
					password: keySecret,
				},
				headers: {
					'Content-Type': 'application/json',
					...extraHeaders,
				},
				data: body,
				timeout: 10000,
			});

			return response.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				const status = error.response?.status;
				const razorpayError = error.response?.data?.error;

				logger.error(
					{
						method,
						path,
						status,
						errorCode: razorpayError?.code,
						reason: razorpayError?.reason,
					},
					`RazorpayX request failed: ${method} ${path}`,
				);

				if (
					path === RAZORPAY_X_PATH.FUND_ACCOUNTS &&
					method === RAZORPAY_HTTP_METHOD.POST &&
					status === 400 &&
					razorpayError?.reason === 'input_validation_failed'
				) {
					throw new InvalidBankAccountError(
						razorpayError.description ?? MESSAGES.INVALID_BANK_ACCOUNT_DETAILS,
					);
				}
			}

			throw new PaymentGatewayError(this.getGatewayErrorMessage(error));
		}
	}

	private getGatewayErrorMessage(error: unknown): string {
		if (axios.isAxiosError(error)) {
			return (
				error.response?.data?.error?.description ?? error.message ?? MESSAGES.PAYMENT_GATEWAY_ERROR
			);
		}

		return error instanceof Error ? error.message : MESSAGES.PAYMENT_GATEWAY_ERROR;
	}

	async createContact(name: string): Promise<{ contactId: string }> {
		const contact = await this.razorpayXRequest<{ id: string }>(
			RAZORPAY_HTTP_METHOD.POST,
			RAZORPAY_X_PATH.CONTACTS,
			{
				name,
				type: 'vendor',
			},
		);

		return {
			contactId: contact.id,
		};
	}

	async createFundAccount(
		contactId: string,
		accountNumber: string,
		ifsc: string,
		accountHolderName: string,
	): Promise<FundAccountDetails> {
		const fundAccount = await this.razorpayXRequest<FundAccountDetailsResponse>(
			RAZORPAY_HTTP_METHOD.POST,
			RAZORPAY_X_PATH.FUND_ACCOUNTS,
			{
				contact_id: contactId,
				account_type: 'bank_account',
				bank_account: {
					name: accountHolderName,
					ifsc,
					account_number: accountNumber,
				},
			},
		);

		return {
			fundAccountId: fundAccount.id,
			contactId: fundAccount.contact_id,
			accountHolderName: fundAccount.bank_account.name,
			accountNumber: fundAccount.bank_account.account_number,
			ifsc: fundAccount.bank_account.ifsc,
			bankName: fundAccount.bank_account.bank_name,
			active: fundAccount.active,
		};
	}

	async getContact(contactId: string): Promise<{ contactId: string }> {
		const contact = await this.razorpayXRequest<{ id: string }>(
			RAZORPAY_HTTP_METHOD.GET,
			`${RAZORPAY_X_PATH.CONTACTS}/${contactId}`,
		);

		return { contactId: contact.id };
	}

	async getFundAccount(fundAccountId: string): Promise<FundAccountDetails> {
		const fundAccount = await this.razorpayXRequest<FundAccountDetailsResponse>(
			RAZORPAY_HTTP_METHOD.GET,
			`${RAZORPAY_X_PATH.FUND_ACCOUNTS}/${fundAccountId}`,
		);

		return {
			fundAccountId: fundAccount.id,
			contactId: fundAccount.contact_id,
			accountHolderName: fundAccount.bank_account.name,
			accountNumber: fundAccount.bank_account.account_number,
			ifsc: fundAccount.bank_account.ifsc,
			bankName: fundAccount.bank_account.bank_name,
			active: fundAccount.active,
		};
	}

	async deactivateFundAccount(fundAccountId: string): Promise<void> {
		await this.razorpayXRequest(
			RAZORPAY_HTTP_METHOD.PATCH,
			`${RAZORPAY_X_PATH.FUND_ACCOUNTS}/${fundAccountId}`,
			{ active: false },
		);
	}

	async createPayout(params: CreatePayoutParams): Promise<PayoutResult> {
		const accountNumber = config.razorpay.payoutAccountNumber;
		if (!accountNumber) {
			throw new PaymentGatewayRequestNotSentError(
				'RazorpayX payout source account is not configured',
			);
		}
		try {
			const payout = await this.razorpayXRequest<{ id: string; status: string }>(
				RAZORPAY_HTTP_METHOD.POST,
				RAZORPAY_X_PATH.PAYOUTS,
				{
					account_number: accountNumber,
					fund_account_id: params.fundAccountId,
					amount: params.amountPaise,
					currency: params.currency,
					mode: params.mode,
					purpose: 'payout',
					reference_id: params.referenceId,
				},
				{ 'X-Payout-Idempotency': params.referenceId },
			);
			return { payoutId: payout.id, status: payout.status };
		} catch (error) {
			if (
				axios.isAxiosError(error) &&
				!error.response &&
				['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH'].includes(
					error.code ?? '',
				)
			) {
				throw new PaymentGatewayRequestNotSentError('RazorpayX could not be reached');
			}
			if (
				axios.isAxiosError(error) &&
				error.response?.status !== undefined &&
				error.response.status >= 400 &&
				error.response.status < 500 &&
				![408, 409, 429].includes(error.response.status)
			) {
				throw new PaymentGatewayError('RazorpayX rejected the payout request');
			}
			if (
				error instanceof PaymentGatewayError ||
				error instanceof PaymentGatewayRequestNotSentError
			) {
				throw error;
			}
			throw new PaymentGatewayError(this.getGatewayErrorMessage(error));
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
