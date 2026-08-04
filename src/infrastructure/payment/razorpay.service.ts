import Razorpay from 'razorpay';
import { config } from '../../config/index.js';
import { logger } from '../logger/index.js';
import { setRazorpayClient } from './razorpay.client.js';

// biome-ignore lint/complexity/noStaticOnlyClass: service structure uses static class methods
export class RazorpayService {
	private static initialized = false;

	static async initialize(): Promise<void> {
		try {
			const { keyId, keySecret } = config.razorpay;

			if (!keyId || !keySecret) {
				throw new Error(
					'Razorpay configuration missing: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not defined',
				);
			}

			if (keyId.trim().length === 0 || keySecret.trim().length === 0) {
				throw new Error('Razorpay credentials cannot be empty');
			}

			const client = new Razorpay({
				key_id: keyId,
				key_secret: keySecret,
			});

			setRazorpayClient(client);
			RazorpayService.initialized = true;

			logger.info('Razorpay Initialized');
		} catch (error) {
			logger.error({ err: error }, 'Razorpay Initialization Failed');
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
