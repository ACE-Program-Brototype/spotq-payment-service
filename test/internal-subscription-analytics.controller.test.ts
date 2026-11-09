import type { IGetPlatformSubscriptionAnalyticsUseCase } from '@application/ports/use-cases/internal/get-platform-subscription-analytics.use-case.port.ts';
import { InternalSubscriptionAnalyticsController } from '@presentation/controllers/internal/internal-subscription-analytics.controller.ts';
import { ANALYTICS_PERIODS, BILLING_CYCLES } from '@shared/constants/analytics.constants.ts';
import { HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import type { Request, Response } from 'express';

describe('InternalSubscriptionAnalyticsController', () => {
	let mockUseCase: jest.Mocked<IGetPlatformSubscriptionAnalyticsUseCase>;
	let controller: InternalSubscriptionAnalyticsController;
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;

	beforeEach(() => {
		mockUseCase = {
			execute: jest.fn().mockResolvedValue({
				activeSubscribedRestaurants: 5,
				currentMrrRupees: 100000,
				currentArrRupees: 1200000,
				grossSubscriptionRevenueRupees: 150000,
				growthPercentage: 10,
				subscriptionTierDistribution: { QUEUE_PRO: 5 },
				timeline: [],
				filters: {
					period: ANALYTICS_PERIODS.MONTH,
					day: null,
					month: 11,
					year: 2026,
					billingCycle: BILLING_CYCLES.ALL,
				},
				generatedAt: new Date().toISOString(),
			}),
		};

		controller = new InternalSubscriptionAnalyticsController(mockUseCase);

		mockReq = {
			query: {},
		};

		mockRes = {
			status: jest.fn().mockReturnThis() as never,
			json: jest.fn().mockReturnThis() as never,
			locals: {
				query: {
					period: ANALYTICS_PERIODS.MONTH,
					month: 11,
					year: 2026,
					billingCycle: BILLING_CYCLES.ALL,
				},
			},
		};
	});

	it('should invoke use case and return 200 OK with formatted response', async () => {
		await controller.getSummary(mockReq as Request, mockRes as Response);

		expect(mockUseCase.execute).toHaveBeenCalledWith({
			period: ANALYTICS_PERIODS.MONTH,
			month: 11,
			year: 2026,
			billingCycle: BILLING_CYCLES.ALL,
			day: undefined,
		});

		expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				message: MESSAGES.PLATFORM_SUBSCRIPTION_ANALYTICS_FETCHED,
				data: expect.objectContaining({
					activeSubscribedRestaurants: 5,
					currentMrrRupees: 100000,
				}),
			}),
		);
	});
});

