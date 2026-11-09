import type { IGetPlatformSubscriptionAnalyticsUseCase } from '@application/ports/use-cases/internal/get-platform-subscription-analytics.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { SubscriptionAnalyticsQueryParams } from '@presentation/validators/internal/subscription-analytics.validator.ts';
import { HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import { sendSuccessResponse } from '@shared/response/api-response.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';

@injectable()
export class InternalSubscriptionAnalyticsController {
	constructor(
		@inject(TYPES.UseCases.GetPlatformSubscriptionAnalyticsUseCase)
		private readonly getPlatformSubscriptionAnalyticsUseCase: IGetPlatformSubscriptionAnalyticsUseCase,
	) {}

	getSummary = async (req: Request, res: Response): Promise<void> => {
		const query = (res.locals.query ?? req.query) as unknown as SubscriptionAnalyticsQueryParams;

		const result = await this.getPlatformSubscriptionAnalyticsUseCase.execute({
			period: query.period,
			day: query.day,
			month: query.month,
			year: query.year,
			billingCycle: query.billingCycle,
		});

		sendSuccessResponse(
			res,
			result,
			MESSAGES.PLATFORM_SUBSCRIPTION_ANALYTICS_FETCHED,
			HTTP_STATUS.OK,
		);
	};
}
