import type { IHealthCheckable, IHealthService, PaymentHealthCheckResult } from '@domain/index.ts';
import { HEALTH_STATUS } from '@shared/constants/index.ts';

export class HealthService implements IHealthService {
	private readonly databaseService: IHealthCheckable;
	private readonly redisService: IHealthCheckable;
	private readonly bullmqService: IHealthCheckable;
	private readonly razorpayService: IHealthCheckable;

	constructor(
		databaseService: IHealthCheckable,
		redisService: IHealthCheckable,
		bullmqService: IHealthCheckable,
		razorpayService: IHealthCheckable,
	) {
		this.databaseService = databaseService;
		this.redisService = redisService;
		this.bullmqService = bullmqService;
		this.razorpayService = razorpayService;
	}

	async check(): Promise<PaymentHealthCheckResult> {
		const [dbHealthy, redisHealthy, bullmqHealthy, razorpayHealthy] = await Promise.all([
			this.databaseService.isHealthy(),
			this.redisService.isHealthy(),
			this.bullmqService.isHealthy(),
			this.razorpayService.isHealthy(),
		]);

		const isHealthy = dbHealthy && redisHealthy && bullmqHealthy && razorpayHealthy;
		const status = isHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN;

		return {
			status,
			timestamp: new Date().toISOString(),
			checks: {
				application: HEALTH_STATUS.UP,
				database: dbHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
				redis: redisHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
				bullmq: bullmqHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
				razorpay: razorpayHealthy ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN,
			},
		};
	}
}
