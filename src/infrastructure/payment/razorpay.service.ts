import { razorpayGateway } from './razorpay.gateway.ts';

// biome-ignore lint/complexity/noStaticOnlyClass: service wrapper for backward compatibility
export class RazorpayService {
	static async initialize(): Promise<void> {
		return razorpayGateway.initialize();
	}

	static isHealthy(): boolean {
		return razorpayGateway.isHealthy();
	}
}
