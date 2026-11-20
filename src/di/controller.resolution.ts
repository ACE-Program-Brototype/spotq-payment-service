import type { AdminSubscriberController } from '@presentation/controllers/admin-subscriber.controller.ts';
import type { PlatformFinanceController } from '@presentation/controllers/platform-finance.controller.ts';
import type { RestaurantWalletController } from '@presentation/controllers/restaurant-wallet.controller.ts';
import type { SubscriptionController } from '@presentation/controllers/subscription.controller.ts';
import { container } from './container.ts';
import { TYPES } from './types.ts';

export const subscriptionController = container.get<SubscriptionController>(
	TYPES.Controllers.SubscriptionController,
);

export const platformFinanceController = container.get<PlatformFinanceController>(
	TYPES.Controllers.PlatformFinanceController,
);

export const restaurantWalletController = container.get<RestaurantWalletController>(
	TYPES.Controllers.RestaurantWalletController,
);

export const adminSubscriberController = container.get<AdminSubscriberController>(
	TYPES.Controllers.AdminSubscriberController,
);
