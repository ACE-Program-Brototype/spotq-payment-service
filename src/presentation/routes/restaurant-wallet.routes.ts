import { restaurantWalletController } from '@di/controller.resolution';
import { redisService } from '@infrastructure/redis/redis.service.ts';
import { idempotencyMiddleware } from '@presentation/middleware/idempotency.middleware.ts';
import { restaurantAdminAuthMiddleware } from '@presentation/middleware/restaurant-admin-auth.middleware.ts';
import {
	validateRequestBody,
	validateRequestHeaders,
	validateRequestQuery,
} from '@presentation/middleware/validation.middleware.ts';
import { RESTAURANT_WALLET_ROUTES } from '@shared/constants';
import { Router } from 'express';
import { linkBankAccountBodySchema } from '../validators/restaurant-wallet/link-bank-account.validator.ts';
import { listWalletLedgerEntriesQuerySchema } from '../validators/restaurant-wallet/list-wallet-ledger-entries.validator.ts';
import {
	withdrawFromRestaurantWalletBodySchema,
	withdrawFromRestaurantWalletHeadersSchema,
} from '../validators/restaurant-wallet/withdraw-from-restaurant-wallet.validator.ts';

export const restaurantWalletRoutes = Router();

restaurantWalletRoutes.get(
	RESTAURANT_WALLET_ROUTES.LEDGER_ENTRIES,
	restaurantAdminAuthMiddleware,
	validateRequestQuery(listWalletLedgerEntriesQuerySchema),
	restaurantWalletController.listLedgerEntries,
);

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

restaurantWalletRoutes.post(
	RESTAURANT_WALLET_ROUTES.WITHDRAW,
	restaurantAdminAuthMiddleware,
	validateRequestHeaders(withdrawFromRestaurantWalletHeadersSchema),
	idempotencyMiddleware({
		cacheService: redisService,
		prefix: 'restaurant-wallet:withdraw:idempotency:',
		lockPrefix: 'restaurant-wallet:withdraw:lock:',
	}),
	validateRequestBody(withdrawFromRestaurantWalletBodySchema),
	restaurantWalletController.withdraw,
);
