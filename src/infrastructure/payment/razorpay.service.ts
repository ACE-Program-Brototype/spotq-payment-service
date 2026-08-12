import type { IHealthCheckable } from '@domain/index.ts';
import { razorpayGateway } from './razorpay.gateway.ts';

export class RazorpayService implements IHealthCheckable {
	async initialize(): Promise<void> {
		return razorpayGateway.initialize();
	}

	async isHealthy(): Promise<boolean> {
		return razorpayGateway.isHealthy();
	}
}

export const razorpayService = new RazorpayService();
