import { env } from '@config/env.ts';
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { ISubscriptionAnalyticsRepository } from '@domain/repositories/subscription-analytics.repository.interface.ts';
import type { SubscriptionAnalyticsRepoResult } from '@domain/types/subscription-analytics.types.ts';
import { databaseService } from '@infrastructure/database/index.ts';
import { bullmqService } from '@infrastructure/queue/index.ts';
import type { RabbitMQService } from '@infrastructure/rabbitmq/index.ts';
import { redisService } from '@infrastructure/redis/index.ts';
import { S2S_CALLER_SERVICES } from '@shared/constants/auth.constants.ts';
import { HTTP_STATUS } from '@shared/constants/http.constants.ts';
import { INTERNAL_ROUTES } from '@shared/constants/routes.constants.ts';
import { generateToken } from '@spotq-org/s2s-core';
import request from 'supertest';
import app from '../src/app.ts';

describe('Internal Platform Subscription Analytics API (SCRUM-1276)', () => {
	const analyticsEndpoint = `${INTERNAL_ROUTES.BASE}${INTERNAL_ROUTES.SUBSCRIPTION_ANALYTICS}`;
	let analyticsRepository: ISubscriptionAnalyticsRepository;
	const rabbitMQService = container.get<RabbitMQService>(TYPES.Services.RabbitMQService);

	const mockRepoResult: SubscriptionAnalyticsRepoResult = {
		activeSubscribedRestaurants: 120,
		currentMrrPaise: 24500000n, // ₹245,000
		currentGrossRevenuePaise: 24500000n, // ₹245,000
		previousGrossRevenuePaise: 21500000n, // ₹215,000
		subscriptionTierDistribution: {
			QUEUE_PRO: 78,
			ENTERPRISE: 42,
		},
		timelineBuckets: [
			{
				bucketLabel: 'Week 1',
				grossRevenuePaise: 5800000n,
				mrrPaise: 5800000n,
				newSubscriptionsCount: 12,
			},
			{
				bucketLabel: 'Week 2',
				grossRevenuePaise: 6100000n,
				mrrPaise: 6100000n,
				newSubscriptionsCount: 14,
			},
		],
	};

	beforeAll(() => {
		analyticsRepository = container.get<ISubscriptionAnalyticsRepository>(
			TYPES.Repositories.SubscriptionAnalyticsRepository,
		);
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(databaseService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(redisService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(bullmqService, 'isHealthy').mockResolvedValue(true);
		jest.spyOn(rabbitMQService, 'isHealthy').mockResolvedValue(true);
		jest
			.spyOn(analyticsRepository, 'getPlatformSubscriptionAnalytics')
			.mockResolvedValue(mockRepoResult);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	const generateS2SToken = (serviceName: string) =>
		generateToken(env.S2S_AUDIENCE, {
			serviceName,
			privateKey: env.S2S_PRIVATE_KEY,
		});

	describe('S2S RS256 Authentication & Authorization', () => {
		it('should return 401 when Authorization header is missing', async () => {
			const res = await request(app).get(analyticsEndpoint);
			expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
		});

		it('should return 401 when caller service is unauthorized (e.g. order-service)', async () => {
			const token = generateS2SToken(S2S_CALLER_SERVICES.ORDER_SERVICE);
			const res = await request(app)
				.get(analyticsEndpoint)
				.set('Authorization', `Bearer ${token}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.ORDER_SERVICE);

			expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
		});

		it('should return 200 when caller service is authorized restaurant-service', async () => {
			const token = generateS2SToken(S2S_CALLER_SERVICES.RESTAURANT_SERVICE);
			const res = await request(app)
				.get(analyticsEndpoint)
				.set('Authorization', `Bearer ${token}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.RESTAURANT_SERVICE);

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.success).toBe(true);
			expect(res.body.data.activeSubscribedRestaurants).toBe(120);
			expect(res.body.data.currentMrrRupees).toBe(245000);
			expect(res.body.data.currentArrRupees).toBe(2940000);
			expect(res.body.data.grossSubscriptionRevenueRupees).toBe(245000);
			expect(res.body.data.subscriptionTierDistribution).toEqual({
				QUEUE_PRO: 78,
				ENTERPRISE: 42,
			});
			expect(res.body.data.timeline).toHaveLength(2);
		});
	});

	describe('Query Parameter Validation & Edge Cases', () => {
		let validToken: string;

		beforeEach(() => {
			validToken = generateS2SToken(S2S_CALLER_SERVICES.RESTAURANT_SERVICE);
		});

		it('should accept valid period, month, year, and billingCycle', async () => {
			const res = await request(app)
				.get(`${analyticsEndpoint}?period=MONTH&month=11&year=2026&billingCycle=YEARLY`)
				.set('Authorization', `Bearer ${validToken}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.RESTAURANT_SERVICE);

			expect(res.status).toBe(HTTP_STATUS.OK);
			expect(res.body.data.filters.period).toBe('MONTH');
			expect(res.body.data.filters.month).toBe(11);
			expect(res.body.data.filters.year).toBe(2026);
			expect(res.body.data.filters.billingCycle).toBe('YEARLY');
		});

		it('should reject invalid period', async () => {
			const res = await request(app)
				.get(`${analyticsEndpoint}?period=HOURLY`)
				.set('Authorization', `Bearer ${validToken}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.RESTAURANT_SERVICE);

			expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		});

		it('should reject invalid calendar date (e.g. Feb 31)', async () => {
			const res = await request(app)
				.get(`${analyticsEndpoint}?period=DAY&day=31&month=2&year=2026`)
				.set('Authorization', `Bearer ${validToken}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.RESTAURANT_SERVICE);

			expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
			expect(JSON.stringify(res.body)).toContain('Invalid calendar date');
		});

		it('should reject unknown query parameters due to strict schema', async () => {
			const res = await request(app)
				.get(`${analyticsEndpoint}?unrecognized=field`)
				.set('Authorization', `Bearer ${validToken}`)
				.set('x-caller-service', S2S_CALLER_SERVICES.RESTAURANT_SERVICE);

			expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
		});
	});
});
