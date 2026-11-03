/**
 * HTTP route definitions for subscription plans, order creation,
 * signature verification, status queries, and payment webhooks.
 */
import { subscriptionController } from '@di/controller.resolution.ts';
import { SUBSCRIPTION_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';

export const subscriptionRouter = Router();

subscriptionRouter.get(SUBSCRIPTION_ROUTES.PLANS, (req, res) =>
	subscriptionController.getPlans(req, res),
);

subscriptionRouter.post(SUBSCRIPTION_ROUTES.ORDER, (req, res) =>
	subscriptionController.createOrder(req, res),
);
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
