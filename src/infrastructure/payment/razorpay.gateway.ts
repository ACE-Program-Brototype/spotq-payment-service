import crypto from 'node:crypto';
import { config } from '@config/index.ts';
import type {
	CreateOrderParams,
	IPaymentGateway,
	PaymentOrderResult,
	VerifyPaymentSignatureParams,
} from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { MESSAGES } from '@shared/constants/index.ts';
import { injectable } from 'inversify';
import Razorpay from 'razorpay';
import { setRazorpayClient } from './razorpay.client.ts';

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

	async getPaymentDetails(paymentId: string): Promise<unknown> {
		if (!this.client) {
			throw new Error('Razorpay client is not initialized');
		}

		return this.client.payments.fetch(paymentId);
	}
}
