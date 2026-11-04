import { RestaurantWallet } from '@domain/entities/restaurant-wallet.entity.ts';
import type { RestaurantWallet as PrismaRestaurantWallet } from '@prisma/client';

export const RestaurantWalletPersistenceMapper = {
	toDomain(record: PrismaRestaurantWallet): RestaurantWallet {
		return new RestaurantWallet({
			id: record.id,
			restaurantId: record.restaurantId,
			balancePaise: record.balancePaise,
			currency: record.currency,
			isLocked: record.isLocked,
			razorpayFundAccountId: record.razorpayFundAccountId,
			bankName: record.bankName,
			bankAccountLast4: record.bankAccountLast4,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	},
};
