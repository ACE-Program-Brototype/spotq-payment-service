import crypto from 'node:crypto';
import { config } from '@config/index.ts';
import type {
	CreateOrderParams,
	FundAccountDetails,
	IPaymentGateway,
	PaymentDetailsResult,
	PaymentOrderResult,
	VerifyPaymentSignatureParams,
} from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	MESSAGES,
	RAZORPAY_HTTP_METHOD,
	RAZORPAY_X_BASE_URL,
	RAZORPAY_X_PATH,
	type RazorpayHttpMethod,
} from '@shared/constants/index.ts';
import axios from 'axios';
import { injectable } from 'inversify';
import Razorpay from 'razorpay';
import { setRazorpayClient } from './razorpay.client.ts';

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

			setRazorpayClient(this.client);
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
			throw new Error('Razorpay client is not initialized');
		}

		const order = await this.client.orders.create({
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
			throw new Error('Razorpay client is not initialized');
		}

		const payment = await this.client.payments.fetch(paymentId);
		return payment as unknown as PaymentDetailsResult;
	}

	private async razorpayXRequest<T>(
		method: RazorpayHttpMethod,
		path: string,
		body?: Record<string, unknown>,
	): Promise<T> {
		const { keyId, keySecret } = config.razorpay;

		if (!keyId || !keySecret) {
			throw new Error(MESSAGES.RAZORPAY_CONFIG_MISSING);
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
				},
				data: body,
				timeout: 10000,
			});

			return response.data;
		} catch (error) {
			logger.error({ err: error }, `RazorpayX request failed: ${method} ${path}`);
			throw error;
		}
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
}
