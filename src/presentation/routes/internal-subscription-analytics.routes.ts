import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import {
	internalS2SAuthMiddleware,
	requireCallerService,
	validateRequestQuery,
} from '@presentation/middleware/index.ts';
import { subscriptionAnalyticsQuerySchema } from '@presentation/validators/internal/subscription-analytics.validator.ts';
import { S2S_CALLER_SERVICES } from '@shared/constants/auth.constants.ts';
import { INTERNAL_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import type { InternalSubscriptionAnalyticsController } from '../controllers/internal/internal-subscription-analytics.controller.ts';

export const internalSubscriptionAnalyticsRouter = Router();

const controller = container.get<InternalSubscriptionAnalyticsController>(
	TYPES.Controllers.InternalSubscriptionAnalyticsController,
);

internalSubscriptionAnalyticsRouter.use(internalS2SAuthMiddleware());
internalSubscriptionAnalyticsRouter.use(
	requireCallerService([S2S_CALLER_SERVICES.RESTAURANT_SERVICE]),
);

internalSubscriptionAnalyticsRouter.get(
	INTERNAL_ROUTES.SUBSCRIPTION_ANALYTICS,
	validateRequestQuery(subscriptionAnalyticsQuerySchema),
	controller.getSummary,
);
