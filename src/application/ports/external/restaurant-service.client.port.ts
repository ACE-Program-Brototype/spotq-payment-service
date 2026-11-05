import type { RestaurantInfoDTO } from '@application/dtos/external/restaurant-info.dto.ts';

export interface IRestaurantServiceClient {
	getRestaurants(): Promise<Map<string, RestaurantInfoDTO>>;
	getRestaurantById(id: string): Promise<RestaurantInfoDTO | null>;
}
