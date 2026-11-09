import { subscriptionController } from '@di/controller.resolution.ts';
import { restaurantAdminAuthMiddleware } from '@presentation/middleware/restaurant-admin-auth.middleware.ts';
import {
	validateRequestBody,
	validateRequestHeaders,
	validateRequestParams,
	validateRequestQuery,
} from '@presentation/middleware/validation.middleware.ts';
import {
	renewSubscriptionBodySchema,
	renewSubscriptionHeadersSchema,
	renewSubscriptionParamsSchema,
} from '@presentation/validators/subscriptions/renew-subscription.validator.ts';
import {
	subscriptionBillingHistoryParamsSchema,
	subscriptionBillingHistoryQuerySchema,
} from '@presentation/validators/subscriptions/subscription-billing-history.validator.ts';
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

const getBillingHistoryPipeline = [
	restaurantAdminAuthMiddleware,
	validateRequestParams(subscriptionBillingHistoryParamsSchema),
	validateRequestQuery(subscriptionBillingHistoryQuerySchema),
	subscriptionController.getBillingHistory,
] as const;

subscriptionRouter.get(SUBSCRIPTION_ROUTES.PLANS, (req, res) =>
	subscriptionController.getPlans(req, res),
);

subscriptionRouter.get(SUBSCRIPTION_ROUTES.HISTORY, ...getBillingHistoryPipeline);

subscriptionRouter.post(SUBSCRIPTION_ROUTES.ORDER, (req, res) =>
	subscriptionController.createOrder(req, res),
);

subscriptionRouter.post(SUBSCRIPTION_ROUTES.RENEW, ...renewSubscriptionPipeline);

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
