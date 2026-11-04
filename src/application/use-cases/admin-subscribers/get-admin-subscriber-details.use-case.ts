import type {
	AdminSubscriberDetailsOutputDTO,
	GetAdminSubscriberDetailsInputDTO,
} from '@application/dtos/admin-subscribers/get-admin-subscriber-details.dto.ts';
import { AdminSubscriberMapper } from '@application/mappers/admin-subscribers/admin-subscriber.mapper.ts';
import type { IGetAdminSubscriberDetailsUseCase } from '@application/ports/use-cases/admin-subscribers/get-admin-subscriber-details.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { SubscriberNotFoundError } from '@domain/errors/payment.errors.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetAdminSubscriberDetailsUseCase implements IGetAdminSubscriberDetailsUseCase {
	constructor(
		@inject(TYPES.Repositories.SubscriptionRepository)
		private readonly subscriptionRepository: ISubscriptionRepository,
	) {}

	async execute(
		input: GetAdminSubscriberDetailsInputDTO,
	): Promise<AdminSubscriberDetailsOutputDTO> {
		const subscriber = await this.subscriptionRepository.findSubscriberDetailById(
			input.subscriberId,
		);

		if (!subscriber) {
			throw new SubscriberNotFoundError();
		}

		return AdminSubscriberMapper.toDetailsDto(subscriber);
	}
}
