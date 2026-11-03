import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import { restaurantAdminAuthMiddleware } from '@presentation/middleware/restaurant-admin-auth.middleware.ts';
import { TRANSACTION_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import type { RestaurantTransactionController } from '../controllers/restaurant-transaction.controller.ts';

export const restaurantTransactionRouter = Router();

const getController = (): RestaurantTransactionController =>
	container.get<RestaurantTransactionController>(TYPES.Controllers.RestaurantTransactionController);

restaurantTransactionRouter.get(
	TRANSACTION_ROUTES.BASE,
	restaurantAdminAuthMiddleware,
	(req, res) => getController().listTransactions(req, res),
);
restaurantTransactionRouter.get(
	TRANSACTION_ROUTES.BY_ID,
	restaurantAdminAuthMiddleware,
	(req, res) => getController().getTransactionDetail(req, res),
);

restaurantTransactionRouter.get(
	TRANSACTION_ROUTES.API_V1_BASE,
	restaurantAdminAuthMiddleware,
	(req, res) => getController().listTransactions(req, res),
);
restaurantTransactionRouter.get(
	TRANSACTION_ROUTES.API_V1_BY_ID,
	restaurantAdminAuthMiddleware,
	(req, res) => getController().getTransactionDetail(req, res),
);
