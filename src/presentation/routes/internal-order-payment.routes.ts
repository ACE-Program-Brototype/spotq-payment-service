import type { ICacheService } from '@application/ports/services/cache.service.port.ts';
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import {
	idempotencyMiddleware,
	internalS2SAuthMiddleware,
	validateRequestBody,
	validateRequestHeaders,
} from '@presentation/middleware/index.ts';
import {
	createOrderPaymentSchema,
	processOrderRefundHeadersSchema,
	processOrderRefundSchema,
} from '@presentation/validators/order-payment.validators.ts';
import {
	REFUND_IDEMPOTENCY_KEY_PREFIX,
	REFUND_LOCK_KEY_PREFIX,
	REFUND_LOCK_TTL_SECONDS,
} from '@shared/constants/index.ts';
import { INTERNAL_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import type { OrderPaymentController } from '../controllers/order-payment.controller.ts';

export const internalOrderPaymentRouter = Router();

const orderPaymentController = container.get<OrderPaymentController>(
	TYPES.Controllers.OrderPaymentController,
);

const cacheService = container.get<ICacheService>(TYPES.Services.CacheService);

internalOrderPaymentRouter.use(internalS2SAuthMiddleware());

internalOrderPaymentRouter.post(
	INTERNAL_ROUTES.CREATE_GATEWAY_ORDER,
	validateRequestBody(createOrderPaymentSchema),
	orderPaymentController.createGatewayOrder,
);

internalOrderPaymentRouter.post(
	INTERNAL_ROUTES.REFUND,
	validateRequestHeaders(processOrderRefundHeadersSchema),
	validateRequestBody(processOrderRefundSchema),
	idempotencyMiddleware({
		cacheService,
		prefix: REFUND_IDEMPOTENCY_KEY_PREFIX,
		lockPrefix: REFUND_LOCK_KEY_PREFIX,
		lockTtlSeconds: REFUND_LOCK_TTL_SECONDS,
	}),
	orderPaymentController.processRefund,
);
