import type { GetRestaurantWalletOverviewOutputDTO } from '@application/dtos/get-restaurant-wallet-overview.dto.ts';

export interface IGetRestaurantWalletOverviewUseCase {
	execute(restaurantId: string): Promise<GetRestaurantWalletOverviewOutputDTO>;
}
