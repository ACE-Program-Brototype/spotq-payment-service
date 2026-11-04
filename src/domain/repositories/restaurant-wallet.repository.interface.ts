import type { RestaurantWallet } from '../entities/restaurant-wallet.entity.ts';
import type { IBaseRepository } from './base.repository.interface.ts';

export interface IRestaurantWalletRepository extends IBaseRepository<RestaurantWallet> {
	findById(id: string): Promise<RestaurantWallet | null>;
	findByRestaurantId(restaurantId: string): Promise<RestaurantWallet | null>;
	create(data: RestaurantWallet): Promise<RestaurantWallet>;
	update(id: string, data: RestaurantWallet): Promise<RestaurantWallet>;
}
