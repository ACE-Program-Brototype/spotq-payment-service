import { prisma } from '@infrastructure/database/index.ts';
import { RazorpayService } from '@infrastructure/payment/index.ts';
import { BullMQService } from '@infrastructure/queue/index.ts';
import { redisClient } from '@infrastructure/redis/index.ts';
import request from 'supertest';
import app from '../src/app.ts';

describe('Payment Service Observability Endpoints', () => {
	beforeEach(() => {
		// Mock Database check
		jest.spyOn(prisma, '$queryRaw').mockResolvedValue([1]);
		// Mock Redis check
		jest.spyOn(redisClient, 'ping').mockResolvedValue('PONG');
		// Mock Razorpay health default to UP
		jest.spyOn(RazorpayService, 'isHealthy').mockReturnValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('GET /health', () => {
		it('should return health status checks containing bullmq and razorpay UP', async () => {
			jest.spyOn(BullMQService, 'isHealthy').mockResolvedValue(true);

			const response = await request(app).get('/health').expect(200);

			expect(response.body).toHaveProperty('status', 'UP');
			expect(response.body.checks).toHaveProperty('bullmq', 'UP');
			expect(response.body.checks).toHaveProperty('razorpay', 'UP');
		});

		it('should return 503 DOWN when bullmq health check fails', async () => {
			jest.spyOn(BullMQService, 'isHealthy').mockResolvedValue(false);

			const response = await request(app).get('/health').expect(503);

			expect(response.body).toHaveProperty('status', 'DOWN');
			expect(response.body.checks).toHaveProperty('bullmq', 'DOWN');
			expect(response.body.checks).toHaveProperty('razorpay', 'UP');
		});

		it('should return 503 DOWN when razorpay health check fails', async () => {
			jest.spyOn(BullMQService, 'isHealthy').mockResolvedValue(true);
			jest.spyOn(RazorpayService, 'isHealthy').mockReturnValue(false);

			const response = await request(app).get('/health').expect(503);

			expect(response.body).toHaveProperty('status', 'DOWN');
			expect(response.body.checks).toHaveProperty('bullmq', 'UP');
			expect(response.body.checks).toHaveProperty('razorpay', 'DOWN');
		});
	});

	describe('GET /ready', () => {
		it('should return 200 OK when all systems are ready', async () => {
			jest.spyOn(BullMQService, 'isHealthy').mockResolvedValue(true);

			const response = await request(app).get('/ready').expect(200);

			expect(response.body).toHaveProperty('status', 'UP');
			expect(response.body.checks).toHaveProperty('bullmq', 'UP');
			expect(response.body.checks).toHaveProperty('razorpay', 'UP');
		});

		it('should return 503 DOWN when dependencies are not ready', async () => {
			jest.spyOn(BullMQService, 'isHealthy').mockResolvedValue(false);

			const response = await request(app).get('/ready').expect(503);

			expect(response.body).toHaveProperty('status', 'DOWN');
			expect(response.body.checks).toHaveProperty('bullmq', 'DOWN');
		});
	});
});
