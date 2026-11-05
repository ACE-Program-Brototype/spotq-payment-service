import { restaurantWalletController } from '@di/controller.resolution';
import { validateRequestParams } from '@presentation/middleware';
import { restaurantAdminAuthMiddleware } from '@presentation/middleware/restaurant-admin.auth.middleware';
import { restaurantIdParamsSchema } from '@presentation/validators/common/restaurant-id-params.validator';
import { RESTAURANT_WALLET_ROUTES } from '@shared/constants';
import { Router } from 'express';

export const restaurantWalletRoutes = Router();

restaurantWalletRoutes.get(
	RESTAURANT_WALLET_ROUTES.WALLET,
	restaurantAdminAuthMiddleware,
	validateRequestParams(restaurantIdParamsSchema),
	restaurantWalletController.getWalletOverview,
);
