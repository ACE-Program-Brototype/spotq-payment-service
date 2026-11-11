import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { DatabaseService } from '@infrastructure/database/index.ts';
import type { BullMQService } from '@infrastructure/queue/index.ts';
import type { RedisService } from '@infrastructure/redis/index.ts';
import { ROUTES } from '@shared/index.ts';
import { Router } from 'express';
import { HealthController } from './health.controller.ts';
import { HealthService } from './health.service.ts';

const router = Router();

const getHealthController = (): HealthController => {
	const databaseService = container.get<DatabaseService>(TYPES.Services.DatabaseService);
	const redisService = container.get<RedisService>(TYPES.Services.RedisService);
	const bullmqService = container.get<BullMQService>(TYPES.Services.BullMQService);
	const paymentGateway = container.get<IPaymentGateway>(TYPES.Gateways.PaymentGateway);
	const healthService = new HealthService(
		databaseService,
		redisService,
		bullmqService,
		paymentGateway,
	);
	return new HealthController(healthService);
};

router.get(ROUTES.HEALTH, (req, res) => getHealthController().check(req, res));
router.get(ROUTES.READY, (req, res) => getHealthController().check(req, res));

export { router as healthRouter };
