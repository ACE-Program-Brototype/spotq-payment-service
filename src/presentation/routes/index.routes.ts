import { healthRouter } from '@modules/health/index.ts';
import { ROUTES } from '@shared/index.ts';
import { Router } from 'express';
import { metricsRouter } from './metrics.routes.ts';
import { subscriptionRouter } from './subscription.routes.ts';

export const router = Router();

router.use(ROUTES.ROOT, healthRouter);
router.use(ROUTES.ROOT, metricsRouter);
router.use(ROUTES.ROOT, subscriptionRouter);
