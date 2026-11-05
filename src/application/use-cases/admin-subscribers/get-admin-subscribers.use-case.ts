import type {
	ListAdminSubscribersOutputDTO,
	ListAdminSubscribersQueryDTO,
} from '@application/dtos/admin-subscribers/list-admin-subscribers.dto.ts';
import { AdminSubscriberMapper } from '@application/mappers/admin-subscribers/admin-subscriber.mapper.ts';
import type { IRestaurantServiceClient } from '@application/ports/external/restaurant-service.client.port.ts';
import type { IGetAdminSubscribersUseCase } from '@application/ports/use-cases/admin-subscribers/get-admin-subscribers.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetAdminSubscribersUseCase implements IGetAdminSubscribersUseCase {
	constructor(
		@inject(TYPES.Repositories.SubscriptionRepository)
		private readonly subscriptionRepository: ISubscriptionRepository,
		@inject(TYPES.Clients.RestaurantServiceClient)
		private readonly restaurantServiceClient: IRestaurantServiceClient,
	) {}

	async execute(query: ListAdminSubscribersQueryDTO): Promise<ListAdminSubscribersOutputDTO> {
		const result = await this.subscriptionRepository.findSubscribersPaginated({
			page: query.page ?? 1,
			limit: query.limit ?? 10,
			status: query.status,
			search: query.search,
			sortBy: query.sortBy,
			sortOrder: query.sortOrder,
		});

		const restaurantMap = await this.restaurantServiceClient.getRestaurants();

		return AdminSubscriberMapper.toListDto(result, restaurantMap);
	}
}
