import { subscriptionController } from '@di/controller.resolution.ts';
import { restaurantAdminAuthMiddleware } from '@presentation/middleware/restaurant-admin-auth.middleware.ts';
import {
	validateRequestBody,
	validateRequestHeaders,
	validateRequestParams,
} from '@presentation/middleware/validation.middleware.ts';
import {
	createSubscriptionOrderSchema,
	verifyPaymentSchema,
} from '@presentation/validators/subscription.validators.ts';
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

subscriptionRouter.get(SUBSCRIPTION_ROUTES.PLANS, subscriptionController.getPlans);

subscriptionRouter.post(
	SUBSCRIPTION_ROUTES.ORDER,
	validateRequestBody(createSubscriptionOrderSchema),
	subscriptionController.createOrder,
);

subscriptionRouter.post(SUBSCRIPTION_ROUTES.RENEW, ...renewSubscriptionPipeline);

subscriptionRouter.post(
	SUBSCRIPTION_ROUTES.VERIFY,
	validateRequestBody(verifyPaymentSchema),
	subscriptionController.verifyPayment,
);
subscriptionRouter.get(SUBSCRIPTION_ROUTES.STATUS, subscriptionController.getStatus);
subscriptionRouter.get(
	SUBSCRIPTION_ROUTES.STATUS_BY_RESTAURANT,
	subscriptionController.getStatusByRestaurant,
);

subscriptionRouter.post(SUBSCRIPTION_ROUTES.WEBHOOK, subscriptionController.handleWebhook);
