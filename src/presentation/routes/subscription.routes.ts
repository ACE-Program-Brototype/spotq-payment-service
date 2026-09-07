import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller.ts';

export const subscriptionRouter = Router();

// Plans
subscriptionRouter.get('/plans', (req, res) => subscriptionController.getPlans(req, res));

// Subscription Order & Verification
subscriptionRouter.post('/subscriptions/order', (req, res) =>
	subscriptionController.createOrder(req, res),
);
subscriptionRouter.post('/subscriptions/verify', (req, res) =>
	subscriptionController.verifyPayment(req, res),
);
subscriptionRouter.get('/subscriptions/status', (req, res) =>
	subscriptionController.getStatus(req, res),
);
subscriptionRouter.get('/subscriptions/status/:restaurantId', (req, res) =>
	subscriptionController.getStatus(req, res),
);

// Webhook
subscriptionRouter.post('/webhook', (req, res) => subscriptionController.handleWebhook(req, res));
