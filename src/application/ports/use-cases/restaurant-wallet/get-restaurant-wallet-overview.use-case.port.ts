import type { GetRestaurantWalletOverviewOutputDTO } from '@application/dtos/restaurant-wallet/get-restaurant-wallet-overview.dto';

export interface IGetRestaurantWalletOverviewUseCase {
	execute(restaurantId: string): Promise<GetRestaurantWalletOverviewOutputDTO>;
}
