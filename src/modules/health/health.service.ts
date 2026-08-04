import type { PrismaClient } from '@prisma/client';
import type { RedisClientType } from 'redis';
import { RazorpayService } from '../../infrastructure/payment/index.js';
import { BullMQService } from '../../infrastructure/queue/index.js';

export interface HealthCheckResult {
	status: 'UP' | 'DOWN';
	timestamp: string;
	checks: {
		application: 'UP';
		database: 'UP' | 'DOWN';
		redis: 'UP' | 'DOWN';
		bullmq: 'UP' | 'DOWN';
		razorpay: 'UP' | 'DOWN';
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
		const status = isHealthy ? 'UP' : 'DOWN';

		return {
			status,
			timestamp: new Date().toISOString(),
			checks: {
				application: 'UP',
				database: dbHealthy ? 'UP' : 'DOWN',
				redis: redisHealthy ? 'UP' : 'DOWN',
				bullmq: bullmqHealthy ? 'UP' : 'DOWN',
				razorpay: razorpayHealthy ? 'UP' : 'DOWN',
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
