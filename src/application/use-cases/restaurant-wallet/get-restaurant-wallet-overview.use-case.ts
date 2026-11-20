import type { GetRestaurantWalletOverviewOutputDTO } from '@application/dtos/restaurant-wallet/get-restaurant-wallet-overview.dto';
import { RestaurantWalletOverviewMapper } from '@application/mappers/restaurant-wallet/restaurant-wallet-overview.mapper';
import type { IGetRestaurantWalletOverviewUseCase } from '@application/ports/use-cases/restaurant-wallet/get-restaurant-wallet-overview.use-case.port';
import { TYPES } from '@di/types.ts';
import { RestaurantWalletNotFoundError } from '@domain/errors/restaurant.errors.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetRestaurantWalletOverviewUseCase implements IGetRestaurantWalletOverviewUseCase {
	constructor(
		@inject(TYPES.Repositories.RestaurantWalletRepository)
		private readonly walletRepository: IRestaurantWalletRepository,
	) {}

	async execute(restaurantId: string): Promise<GetRestaurantWalletOverviewOutputDTO> {
		const overview = await this.walletRepository.getOverview(restaurantId);
		if (!overview?.wallet) {
			throw new RestaurantWalletNotFoundError();
		}

		return RestaurantWalletOverviewMapper.toDto(overview);
	}
}
