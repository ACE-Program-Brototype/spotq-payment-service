import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import { databaseService } from '@infrastructure/database/index.ts';
import { bullmqService } from '@infrastructure/queue/index.ts';
import { redisService } from '@infrastructure/redis/index.ts';
import { ROUTES } from '@shared/index.ts';
import { Router } from 'express';
import { HealthController } from './health.controller.ts';
import { HealthService } from './health.service.ts';

const router = Router();

const getHealthController = (): HealthController => {
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
