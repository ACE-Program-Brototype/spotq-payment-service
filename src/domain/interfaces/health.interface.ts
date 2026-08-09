import type { HealthStatus } from '@shared/constants/index.ts';

export interface IHealthCheckable {
	isHealthy(): Promise<boolean> | boolean;
}

export interface PaymentHealthCheckResult {
	status: HealthStatus;
	timestamp: string;
	checks: {
		application: HealthStatus;
		database: HealthStatus;
		redis: HealthStatus;
		bullmq: HealthStatus;
		razorpay: HealthStatus;
	};
}

export interface IHealthService {
	check(): Promise<PaymentHealthCheckResult>;
}
