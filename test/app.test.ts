import { databaseService } from '@infrastructure/database/index.ts';
import { razorpayService } from '@infrastructure/payment/index.ts';
import { bullmqService } from '@infrastructure/queue/index.ts';
import { redisService } from '@infrastructure/redis/index.ts';
import { HEALTH_STATUS, HTTP_STATUS, MESSAGES, ROUTES } from '@shared/index.ts';
import request from 'supertest';
import app from '../src/app.ts';

describe('Payment Service Observability Endpoints', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Mock Database check
		jest.spyOn(databaseService, 'isHealthy').mockResolvedValue(true);
		// Mock Redis check
		jest.spyOn(redisService, 'isHealthy').mockResolvedValue(true);
		// Mock Razorpay health default to UP
		jest.spyOn(razorpayService, 'isHealthy').mockResolvedValue(true);
		// Mock BullMQ health default to UP
		jest.spyOn(bullmqService, 'isHealthy').mockResolvedValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await bullmqService.disconnect();
		await redisService.disconnect();
		await databaseService.disconnect();
	});

	describe('GET /health', () => {
		it('should return health status checks containing bullmq and razorpay UP', async () => {
			const response = await request(app).get(ROUTES.HEALTH).expect(HTTP_STATUS.OK);

			expect(response.body).toHaveProperty('status', HEALTH_STATUS.UP);
			expect(response.body.checks).toHaveProperty('bullmq', HEALTH_STATUS.UP);
			expect(response.body.checks).toHaveProperty('razorpay', HEALTH_STATUS.UP);
		});

		it('should return 503 DOWN when bullmq health check fails', async () => {
			jest.spyOn(bullmqService, 'isHealthy').mockResolvedValue(false);

			const response = await request(app)
				.get(ROUTES.HEALTH)
				.expect(HTTP_STATUS.SERVICE_UNAVAILABLE);

			expect(response.body).toHaveProperty('status', HEALTH_STATUS.DOWN);
			expect(response.body.checks).toHaveProperty('bullmq', HEALTH_STATUS.DOWN);
			expect(response.body.checks).toHaveProperty('razorpay', HEALTH_STATUS.UP);
		});

		it('should return 503 DOWN when razorpay health check fails', async () => {
			jest.spyOn(razorpayService, 'isHealthy').mockResolvedValue(false);

			const response = await request(app)
				.get(ROUTES.HEALTH)
				.expect(HTTP_STATUS.SERVICE_UNAVAILABLE);

			expect(response.body).toHaveProperty('status', HEALTH_STATUS.DOWN);
			expect(response.body.checks).toHaveProperty('bullmq', HEALTH_STATUS.UP);
			expect(response.body.checks).toHaveProperty('razorpay', HEALTH_STATUS.DOWN);
		});
	});

	describe('GET /ready', () => {
		it('should return 200 OK when all systems are ready', async () => {
			const response = await request(app).get(ROUTES.READY).expect(HTTP_STATUS.OK);

			expect(response.body).toHaveProperty('status', HEALTH_STATUS.UP);
			expect(response.body.checks).toHaveProperty('bullmq', HEALTH_STATUS.UP);
			expect(response.body.checks).toHaveProperty('razorpay', HEALTH_STATUS.UP);
		});

		it('should return 503 DOWN when dependencies are not ready', async () => {
			jest.spyOn(bullmqService, 'isHealthy').mockResolvedValue(false);

			const response = await request(app).get(ROUTES.READY).expect(HTTP_STATUS.SERVICE_UNAVAILABLE);

			expect(response.body).toHaveProperty('status', HEALTH_STATUS.DOWN);
			expect(response.body.checks).toHaveProperty('bullmq', HEALTH_STATUS.DOWN);
		});
	});

	describe('Routing', () => {
		it('should return 404 not found for invalid routes', async () => {
			const response = await request(app).get('/invalid-route-xyz').expect(HTTP_STATUS.NOT_FOUND);

			expect(response.body).toEqual(
				expect.objectContaining({
					success: false,
					error: MESSAGES.NOT_FOUND,
					message: 'Cannot GET /invalid-route-xyz',
				}),
			);
			expect(response.body).toHaveProperty('timestamp');
		});
	});
});
