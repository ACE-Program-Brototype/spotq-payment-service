import { prisma } from '@infrastructure/database/index.ts';
import { redisClient } from '@infrastructure/redis/index.ts';
import { Router } from 'express';
import { HealthController } from './health.controller.ts';
import { HealthService } from './health.service.ts';

const router = Router();
const healthService = new HealthService(prisma, redisClient);
const healthController = new HealthController(healthService);

router.get('/health', healthController.check);
router.get('/ready', healthController.check);

export { router as healthRouter };
