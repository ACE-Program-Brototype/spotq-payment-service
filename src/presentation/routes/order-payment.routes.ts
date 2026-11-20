import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import {
	customerAuthMiddleware,
	validateRequestBody,
	validateRequestParams,
} from '@presentation/middleware/index.ts';
import {
	getOrderPaymentStatusParamsSchema,
	verifyOrderPaymentSchema,
} from '@presentation/validators/order-payment.validators.ts';
import { ORDER_PAYMENT_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import type { OrderPaymentController } from '../controllers/order-payment.controller.ts';

export const orderPaymentRouter = Router();

const orderPaymentController = container.get<OrderPaymentController>(
	TYPES.Controllers.OrderPaymentController,
);

orderPaymentRouter.post(
	ORDER_PAYMENT_ROUTES.VERIFY,
	customerAuthMiddleware,
	validateRequestBody(verifyOrderPaymentSchema),
	orderPaymentController.verifyPayment,
);

orderPaymentRouter.get(
	ORDER_PAYMENT_ROUTES.STATUS,
	customerAuthMiddleware,
	validateRequestParams(getOrderPaymentStatusParamsSchema),
	orderPaymentController.getStatus,
);
