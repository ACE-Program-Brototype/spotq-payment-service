import { restaurantWalletController } from '@di/controller.resolution';
import { restaurantAdminAuthMiddleware } from '@presentation/middleware/restaurant-admin.auth.middleware';
import { validateRequestBody } from '@presentation/middleware/validation.middleware';
import { RESTAURANT_WALLET_ROUTES } from '@shared/constants';
import { Router } from 'express';
import { linkBankAccountBodySchema } from '../validators/restaurant-wallet/link-bank-account.validator.ts';

export const restaurantWalletRoutes = Router();

restaurantWalletRoutes.get(
	RESTAURANT_WALLET_ROUTES.WALLET,
	restaurantAdminAuthMiddleware,
	restaurantWalletController.getWalletOverview,
);

restaurantWalletRoutes.post(
	RESTAURANT_WALLET_ROUTES.LINK_BANK,
	restaurantAdminAuthMiddleware,
	validateRequestBody(linkBankAccountBodySchema),
	restaurantWalletController.linkBankAccount,
);
