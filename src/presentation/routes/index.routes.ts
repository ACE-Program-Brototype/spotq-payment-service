import { healthRouter } from '@modules/health/index.ts';
import {
	INTERNAL_ROUTES,
	PLATFORM_FINANCE_ROUTES,
	ROUTES,
	TRANSACTION_ROUTES,
} from '@shared/index.ts';
import { Router } from 'express';
import { internalOrderPaymentRouter } from './internal-order-payment.routes.ts';
import { metricsRouter } from './metrics.routes.ts';
import { orderPaymentRouter } from './order-payment.routes.ts';
import { platformFinanceRouter } from './platform-finance.routes.ts';
import { restaurantTransactionRouter } from './restaurant-transaction.routes.ts';
import { subscriptionRouter } from './subscription.routes.ts';

export const router = Router();

router.use(ROUTES.ROOT, healthRouter);
router.use(ROUTES.ROOT, metricsRouter);
router.use(ROUTES.ROOT, subscriptionRouter);
router.use(TRANSACTION_ROUTES.BASE, restaurantTransactionRouter);
router.use(TRANSACTION_ROUTES.API_V1_BASE, restaurantTransactionRouter);
router.use(PLATFORM_FINANCE_ROUTES.ROOT, platformFinanceRouter);
router.use(ROUTES.ROOT, orderPaymentRouter);
router.use(INTERNAL_ROUTES.BASE, internalOrderPaymentRouter);
