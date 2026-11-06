import { subscriptionController } from '@di/controller.resolution.ts';
import { restaurantAdminAuthMiddleware } from '@presentation/middleware/restaurant-admin-auth.middleware.ts';
import {
	validateRequestBody,
	validateRequestHeaders,
	validateRequestParams,
} from '@presentation/middleware/validation.middleware.ts';
import {
	renewSubscriptionBodySchema,
	renewSubscriptionHeadersSchema,
	renewSubscriptionParamsSchema,
} from '@presentation/validators/subscriptions/renew-subscription.validator.ts';
import { SUBSCRIPTION_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';

export const subscriptionRouter = Router();

const renewSubscriptionPipeline = [
	restaurantAdminAuthMiddleware,
	validateRequestParams(renewSubscriptionParamsSchema),
	validateRequestHeaders(renewSubscriptionHeadersSchema),
	validateRequestBody(renewSubscriptionBodySchema),
	subscriptionController.renewSubscription,
] as const;

subscriptionRouter.get(SUBSCRIPTION_ROUTES.PLANS, (req, res) =>
	subscriptionController.getPlans(req, res),
);

subscriptionRouter.post(SUBSCRIPTION_ROUTES.ORDER, (req, res) =>
	subscriptionController.createOrder(req, res),
);

subscriptionRouter.post(SUBSCRIPTION_ROUTES.RENEW, ...renewSubscriptionPipeline);
subscriptionRouter.post(SUBSCRIPTION_ROUTES.RENEW_SINGULAR, ...renewSubscriptionPipeline);
subscriptionRouter.post(SUBSCRIPTION_ROUTES.API_V1_RENEW, ...renewSubscriptionPipeline);
subscriptionRouter.post(SUBSCRIPTION_ROUTES.API_V1_RENEW_PLURAL, ...renewSubscriptionPipeline);

subscriptionRouter.post(SUBSCRIPTION_ROUTES.VERIFY, (req, res) =>
	subscriptionController.verifyPayment(req, res),
);
subscriptionRouter.get(SUBSCRIPTION_ROUTES.STATUS, (req, res) =>
	subscriptionController.getStatus(req, res),
);
subscriptionRouter.get(SUBSCRIPTION_ROUTES.STATUS_BY_RESTAURANT, (req, res) =>
	subscriptionController.getStatus(req, res),
);

subscriptionRouter.post(SUBSCRIPTION_ROUTES.WEBHOOK, (req, res) =>
	subscriptionController.handleWebhook(req, res),
);
