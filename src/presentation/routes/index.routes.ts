import { healthRouter } from '@modules/health/index.ts';
import { Router } from 'express';
import { metricsRouter } from './metrics.routes.ts';

export const router = Router();

router.use('/', healthRouter);
router.use('/', metricsRouter);
