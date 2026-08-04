import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/infrastructure/database/index.js';
import { BullMQService } from '../src/infrastructure/queue/index.js';
import { redisClient } from '../src/infrastructure/redis/index.js';

describe('Payment Service Health Endpoint', () => {
	beforeEach(() => {
		// Mock Database check
		jest.spyOn(prisma, '$queryRaw').mockResolvedValue([1]);
		// Mock Redis check
		jest.spyOn(redisClient, 'ping').mockResolvedValue('PONG');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should return health status checks containing bullmq UP', async () => {
		jest.spyOn(BullMQService, 'isHealthy').mockResolvedValue(true);

		const response = await request(app).get('/health').expect(200);

		expect(response.body).toHaveProperty('status', 'UP');
		expect(response.body.checks).toHaveProperty('bullmq', 'UP');
	});

	it('should return 503 DOWN when bullmq health check fails', async () => {
		jest.spyOn(BullMQService, 'isHealthy').mockResolvedValue(false);

		const response = await request(app).get('/health').expect(503);

		expect(response.body).toHaveProperty('status', 'DOWN');
		expect(response.body.checks).toHaveProperty('bullmq', 'DOWN');
	});
});
