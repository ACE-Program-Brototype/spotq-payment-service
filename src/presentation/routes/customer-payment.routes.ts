import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import {
	customerAuthMiddleware,
	validateRequestParams,
	validateRequestQuery,
} from '@presentation/middleware/index.ts';
import { getCustomerOrderRefundStatusParamsSchema } from '@presentation/validators/customer-payment/get-customer-order-refund-status.validator.ts';
import {
	customerTransactionIdParamsSchema,
	getCustomerPaymentHistorySchema,
	retryCustomerPaymentParamsSchema,
} from '@presentation/validators/customer-payment.validators.ts';
import { CUSTOMER_PAYMENT_ROUTES, TRANSACTION_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import type { CustomerPaymentController } from '../controllers/customer-payment.controller.ts';

export const customerPaymentRouter = Router();

const customerPaymentController = container.get<CustomerPaymentController>(
	TYPES.Controllers.CustomerPaymentController,
);

customerPaymentRouter.get(
	CUSTOMER_PAYMENT_ROUTES.ORDER_REFUND_STATUS,
	customerAuthMiddleware,
	validateRequestParams(getCustomerOrderRefundStatusParamsSchema),
	customerPaymentController.getOrderRefundStatus,
);

customerPaymentRouter.get(
	CUSTOMER_PAYMENT_ROUTES.HISTORY,
	customerAuthMiddleware,
	validateRequestQuery(getCustomerPaymentHistorySchema),
	customerPaymentController.getPaymentHistory,
);

customerPaymentRouter.post(
	CUSTOMER_PAYMENT_ROUTES.RETRY,
	customerAuthMiddleware,
	validateRequestParams(retryCustomerPaymentParamsSchema),
	customerPaymentController.retryPayment,
);

customerPaymentRouter.get(
	TRANSACTION_ROUTES.INVOICE,
	customerAuthMiddleware,
	validateRequestParams(customerTransactionIdParamsSchema),
	customerPaymentController.getInvoice,
);
