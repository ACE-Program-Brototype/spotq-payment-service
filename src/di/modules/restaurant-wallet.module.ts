import type { IGetRestaurantWalletOverviewUseCase } from '@application/ports/use-cases/restaurant-wallet/get-restaurant-wallet-overview.use-case.port.ts';
import type { ILinkBankAccountUseCase } from '@application/ports/use-cases/restaurant-wallet/link-bank-account.use-case.port.ts';
import type { IWithdrawFromRestaurantWalletUseCase } from '@application/ports/use-cases/restaurant-wallet/withdraw-from-restaurant-wallet.use-case.port.ts';
import { GetRestaurantWalletOverviewUseCase } from '@application/use-cases/restaurant-wallet/get-restaurant-wallet-overview.use-case.ts';
import { LinkBankAccountUseCase } from '@application/use-cases/restaurant-wallet/link-bank-account.use-case.ts';
import { WithdrawFromRestaurantWalletUseCase } from '@application/use-cases/restaurant-wallet/withdraw-from-restaurant-wallet.use-case.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import { PrismaRestaurantWalletRepository } from '@infrastructure/repositories/prisma-restaurant-wallet.repository.ts';
import { RestaurantWalletController } from '@presentation/controllers/restaurant-wallet.controller.ts';
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

	bind<ILinkBankAccountUseCase>(TYPES.UseCases.RestaurantWallet.LinkBankAccountUseCase)
		.to(LinkBankAccountUseCase)
		.inSingletonScope();

	bind<IWithdrawFromRestaurantWalletUseCase>(
		TYPES.UseCases.RestaurantWallet.WithdrawFromRestaurantWalletUseCase,
	)
		.to(WithdrawFromRestaurantWalletUseCase)
		.inSingletonScope();

	bind<RestaurantWalletController>(TYPES.Controllers.RestaurantWalletController)
		.to(RestaurantWalletController)
		.inSingletonScope();
});
