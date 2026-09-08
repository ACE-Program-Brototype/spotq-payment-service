/**
 * HTTP route definitions for subscription plans, order creation,
 * signature verification, status queries, and payment webhooks.
 */
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import { Router } from 'express';
import type { SubscriptionController } from '../controllers/subscription.controller.ts';

export const subscriptionRouter = Router();

const getController = (): SubscriptionController =>
	container.get<SubscriptionController>(TYPES.Controllers.SubscriptionController);

subscriptionRouter.get('/plans', (req, res) => getController().getPlans(req, res));

subscriptionRouter.post('/subscriptions/order', (req, res) =>
	getController().createOrder(req, res),
);
subscriptionRouter.post('/subscriptions/verify', (req, res) =>
	getController().verifyPayment(req, res),
);
subscriptionRouter.get('/subscriptions/status', (req, res) => getController().getStatus(req, res));
subscriptionRouter.get('/subscriptions/status/:restaurantId', (req, res) =>
	getController().getStatus(req, res),
);

subscriptionRouter.post('/webhook', (req, res) => getController().handleWebhook(req, res));
