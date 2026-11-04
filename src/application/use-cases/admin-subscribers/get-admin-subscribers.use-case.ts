import type {
	ListAdminSubscribersOutputDTO,
	ListAdminSubscribersQueryDTO,
} from '@application/dtos/admin-subscribers/list-admin-subscribers.dto.ts';
import type { IGetAdminSubscribersUseCase } from '@application/ports/use-cases/admin-subscribers/get-admin-subscribers.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetAdminSubscribersUseCase implements IGetAdminSubscribersUseCase {
	constructor(
		@inject(TYPES.Repositories.SubscriptionRepository)
		private readonly subscriptionRepository: ISubscriptionRepository,
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

		return {
			subscribers: result.subscribers.map((sub) => ({
				id: sub.id,
				restaurantId: sub.restaurantId,
				planId: sub.planId,
				status: sub.status,
				currentPeriodStart: sub.currentPeriodStart.toISOString(),
				currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
				canceledAt: sub.canceledAt ? sub.canceledAt.toISOString() : null,
				createdAt: sub.createdAt.toISOString(),
				updatedAt: sub.updatedAt.toISOString(),
				plan: {
					id: sub.plan.id,
					code: sub.plan.code,
					name: sub.plan.name,
					description: sub.plan.description,
					pricePaise: sub.plan.pricePaise,
					currency: sub.plan.currency,
					billingCycle: sub.plan.billingCycle,
					features: sub.plan.features,
					isActive: sub.plan.isActive,
				},
			})),
			pagination: result.pagination,
		};
	}
}
