import crypto from 'node:crypto';
import { config } from '@config/index.ts';
import {
	InvalidBankAccountError,
	PaymentGatewayError,
	PaymentGatewayRequestNotSentError,
} from '@domain/errors/payment.errors.ts';
import type {
	CreateOrderParams,
	CreatePayoutParams,
	CreateRefundParams,
	FundAccountDetails,
	IPaymentGateway,
	PaymentDetailsResult,
	PaymentOrderResult,
	PaymentRefundResult,
	PayoutResult,
	VerifyPaymentSignatureParams,
} from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	DEFAULT_REFUND_SPEED,
	MESSAGES,
	RAZORPAY_HTTP_METHOD,
	RAZORPAY_X_BASE_URL,
	RAZORPAY_X_PATH,
	type RazorpayHttpMethod,
} from '@shared/constants/index.ts';
import axios from 'axios';
import { injectable } from 'inversify';
import Razorpay from 'razorpay';

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

			this.initialized = true;

			logger.info(MESSAGES.RAZORPAY_INITIALIZED);
		} catch (error) {
			logger.error({ err: error }, MESSAGES.RAZORPAY_INITIALIZATION_FAILED);
			this.initialized = false;
			throw error;
		}
	}

	isHealthy(): boolean {
		if (!this.initialized || !this.client) {
			return false;
		}

		const { keyId, keySecret } = config.razorpay;
		return !!(keyId && keySecret && keyId.trim().length > 0 && keySecret.trim().length > 0);
	}

	async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
		if (!this.client) {
			throw new PaymentGatewayError(MESSAGES.RAZORPAY_INITIALIZATION_FAILED);
		}

		let order: {
			id: string;
			amount: number | string;
			currency: string;
			status: string;
			receipt?: string | null;
		};
		try {
			order = await this.client.orders.create({
				amount: params.amountInPaise,
				currency: params.currency,
				receipt: params.receiptId,
				notes: params.notes,
			});
		} catch (error) {
			throw new PaymentGatewayError(this.getGatewayErrorMessage(error));
		}

		return {
			orderId: order.id,
			amount: Number(order.amount),
			currency: order.currency,
			status: order.status,
			receipt: order.receipt ?? undefined,
		};
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
		if (!this.client) {
			throw new PaymentGatewayError(MESSAGES.RAZORPAY_INITIALIZATION_FAILED);
		}

		let payment: unknown;
		try {
			payment = await this.client.payments.fetch(paymentId);
		} catch (error) {
			throw new PaymentGatewayError(this.getGatewayErrorMessage(error));
		}
		return payment as PaymentDetailsResult;
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
		if (!this.client) {
			throw new Error(MESSAGES.RAZORPAY_CLIENT_NOT_INITIALIZED);
		}

		const refund = await this.client.payments.refund(params.paymentId, {
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
			arn: (refund as unknown as { arn?: string }).arn,
		};
	}
}
