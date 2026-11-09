import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import { restaurantAdminAuthMiddleware } from '@presentation/middleware/restaurant-admin-auth.middleware.ts';
import { Router } from 'express';
import type { RestaurantTransactionController } from '../controllers/restaurant-transaction.controller.ts';

export const restaurantTransactionRouter = Router();

const getController = (): RestaurantTransactionController =>
	container.get<RestaurantTransactionController>(TYPES.Controllers.RestaurantTransactionController);

restaurantTransactionRouter.use(restaurantAdminAuthMiddleware);

restaurantTransactionRouter.get('/', (req, res) => getController().listTransactions(req, res));
restaurantTransactionRouter.get('/:id', (req, res) =>
	getController().getTransactionDetail(req, res),
);
