import { config } from '@config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { MESSAGES } from '@shared/constants/index.ts';
import Razorpay from 'razorpay';
import { setRazorpayClient } from './razorpay.client.ts';

// biome-ignore lint/complexity/noStaticOnlyClass: service structure uses static class methods
export class RazorpayService {
	private static initialized = false;

	static async initialize(): Promise<void> {
		try {
			const { keyId, keySecret } = config.razorpay;

			if (!keyId || !keySecret) {
				throw new Error(MESSAGES.RAZORPAY_CONFIG_MISSING);
			}

			if (keyId.trim().length === 0 || keySecret.trim().length === 0) {
				throw new Error(MESSAGES.RAZORPAY_CREDS_EMPTY);
			}

			const client = new Razorpay({
				key_id: keyId,
				key_secret: keySecret,
			});

			setRazorpayClient(client);
			RazorpayService.initialized = true;

			logger.info(MESSAGES.RAZORPAY_INITIALIZED);
		} catch (error) {
			logger.error({ err: error }, MESSAGES.RAZORPAY_INITIALIZATION_FAILED);
			RazorpayService.initialized = false;
			throw error;
		}
	}

	static isHealthy(): boolean {
		if (!RazorpayService.initialized) {
			return false;
		}

		const { keyId, keySecret } = config.razorpay;
		return !!(keyId && keySecret && keyId.trim().length > 0 && keySecret.trim().length > 0);
	}
}
