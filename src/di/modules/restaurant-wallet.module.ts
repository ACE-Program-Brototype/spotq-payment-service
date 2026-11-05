import type { IGetRestaurantWalletOverviewUseCase } from '@application/ports/use-cases/get-restaurant-wallet-overview.use-case.port.ts';
import { GetRestaurantWalletOverviewUseCase } from '@application/use-cases/get-restaurant-wallet-overview.use-case.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import { PrismaRestaurantWalletRepository } from '@infrastructure/repositories/prisma-restaurant-wallet.repository.ts';
import { ContainerModule } from 'inversify';
import { TYPES } from '../types.ts';

export const restaurantWalletModule = new ContainerModule(({ bind }) => {
	bind<IRestaurantWalletRepository>(TYPES.Repositories.RestaurantWalletRepository)
		.to(PrismaRestaurantWalletRepository)
		.inSingletonScope();

	bind<IGetRestaurantWalletOverviewUseCase>(
		TYPES.UseCases.RestaurantWallet.GetRestaurantWalletOverviewUseCase,
	)
		.to(GetRestaurantWalletOverviewUseCase)
		.inSingletonScope();
});
