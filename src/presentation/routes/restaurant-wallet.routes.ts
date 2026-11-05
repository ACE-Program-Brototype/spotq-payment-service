import { restaurantWalletController } from '@di/controller.resolution';
import { restaurantAdminAuthMiddleware } from '@presentation/middleware/restaurant-admin.auth.middleware';
import { RESTAURANT_WALLET_ROUTES } from '@shared/constants';
import { Router } from 'express';

export const restaurantWalletRoutes = Router();

restaurantWalletRoutes.get(
	RESTAURANT_WALLET_ROUTES.WALLET,
	restaurantAdminAuthMiddleware,
	restaurantWalletController.getWalletOverview,
);

