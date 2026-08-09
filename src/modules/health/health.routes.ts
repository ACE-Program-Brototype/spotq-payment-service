import { databaseService } from '@infrastructure/database/index.ts';
import { razorpayService } from '@infrastructure/payment/index.ts';
import { bullmqService } from '@infrastructure/queue/index.ts';
import { redisService } from '@infrastructure/redis/index.ts';
import { Router } from 'express';
import { HealthController } from './health.controller.ts';
import { HealthService } from './health.service.ts';

const router = Router();
const healthService = new HealthService(
	databaseService,
	redisService,
	bullmqService,
	razorpayService,
);
const healthController = new HealthController(healthService);

router.get('/health', healthController.check);
router.get('/ready', healthController.check);

export { healthController, healthService, router as healthRouter };
