/**
 * HTTP route definitions for subscription plans, order creation,
 * signature verification, status queries, and payment webhooks.
 */
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import { SUBSCRIPTION_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import type { SubscriptionController } from '../controllers/subscription.controller.ts';

export const subscriptionRouter = Router();

const getController = (): SubscriptionController =>
	container.get<SubscriptionController>(TYPES.Controllers.SubscriptionController);

subscriptionRouter.get(SUBSCRIPTION_ROUTES.PLANS, (req, res) => getController().getPlans(req, res));

subscriptionRouter.post(SUBSCRIPTION_ROUTES.ORDER, (req, res) =>
	getController().createOrder(req, res),
);
subscriptionRouter.post(SUBSCRIPTION_ROUTES.VERIFY, (req, res) =>
	getController().verifyPayment(req, res),
);
subscriptionRouter.get(SUBSCRIPTION_ROUTES.STATUS, (req, res) =>
	getController().getStatus(req, res),
);
subscriptionRouter.get(SUBSCRIPTION_ROUTES.STATUS_BY_RESTAURANT, (req, res) =>
	getController().getStatus(req, res),
);

subscriptionRouter.post(SUBSCRIPTION_ROUTES.WEBHOOK, (req, res) =>
	getController().handleWebhook(req, res),
);
