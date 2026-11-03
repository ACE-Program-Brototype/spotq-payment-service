import { healthRouter } from '@modules/health/index.ts';
import { INTERNAL_ROUTES, ROUTES } from '@shared/index.ts';
import { Router } from 'express';
import { internalOrderPaymentRouter } from './internal-order-payment.routes.ts';
import { metricsRouter } from './metrics.routes.ts';
import { orderPaymentRouter } from './order-payment.routes.ts';
import { subscriptionRouter } from './subscription.routes.ts';

export const router = Router();

router.use(ROUTES.ROOT, healthRouter);
router.use(ROUTES.ROOT, metricsRouter);
router.use(ROUTES.ROOT, subscriptionRouter);
router.use(ROUTES.ROOT, orderPaymentRouter);
router.use(INTERNAL_ROUTES.BASE, internalOrderPaymentRouter);
