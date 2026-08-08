import type { PrismaClient } from '@prisma/client';
import type { RedisClientType } from 'redis';
import { RazorpayService } from '../../infrastructure/payment/index.js';
import { BullMQService } from '../../infrastructure/queue/index.js';
import { HEALTH_STATUS, type HealthStatus } from '../../shared/constants/index.js';

export interface HealthCheckResult {
	status: HealthStatus;
	timestamp: string;
	checks: {
		application: typeof HEALTH_STATUS.UP;
		database: HealthStatus;
		redis: HealthStatus;
		bullmq: HealthStatus;
		razorpay: HealthStatus;
	};
}

export class HealthService {
	private readonly prisma: PrismaClient;
	private readonly redisClient: RedisClientType;

	constructor(prisma: PrismaClient, redisClient: RedisClientType) {
		this.prisma = prisma;
		this.redisClient = redisClient;
	}

	async check(): Promise<HealthCheckResult> {
		const [dbHealthy, redisHealthy, bullmqHealthy] = await Promise.all([
			this.checkDatabase(),
			this.checkRedis(),
			BullMQService.isHealthy(),
		]);

		const razorpayHealthy = RazorpayService.isHealthy();
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

	private async checkDatabase(): Promise<boolean> {
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return true;
		} catch {
			return false;
		}
	}

	private async checkRedis(): Promise<boolean> {
		try {
			const response = await this.redisClient.ping();
			return response === 'PONG';
		} catch {
			return false;
		}
	}
}
