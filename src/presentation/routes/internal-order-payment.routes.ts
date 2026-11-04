import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import { internalS2SAuthMiddleware, validateRequestBody } from '@presentation/middleware/index.ts';
import { createOrderPaymentSchema } from '@presentation/validators/order-payment.validators.ts';
import { INTERNAL_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import type { OrderPaymentController } from '../controllers/order-payment.controller.ts';

export const internalOrderPaymentRouter = Router();

const orderPaymentController = container.get<OrderPaymentController>(
	TYPES.Controllers.OrderPaymentController,
);

internalOrderPaymentRouter.use(internalS2SAuthMiddleware());

internalOrderPaymentRouter.post(
	INTERNAL_ROUTES.CREATE_GATEWAY_ORDER,
	validateRequestBody(createOrderPaymentSchema),
	orderPaymentController.createGatewayOrder,
);
