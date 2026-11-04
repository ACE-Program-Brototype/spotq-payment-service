import type {
	AdminSubscriberDetailsOutputDTO,
	GetAdminSubscriberDetailsInputDTO,
} from '@application/dtos/admin-subscribers/get-admin-subscriber-details.dto.ts';
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

		return {
			id: subscriber.id,
			restaurantId: subscriber.restaurantId,
			planId: subscriber.planId,
			status: subscriber.status,
			currentPeriodStart: subscriber.currentPeriodStart.toISOString(),
			currentPeriodEnd: subscriber.currentPeriodEnd.toISOString(),
			canceledAt: subscriber.canceledAt ? subscriber.canceledAt.toISOString() : null,
			createdAt: subscriber.createdAt.toISOString(),
			updatedAt: subscriber.updatedAt.toISOString(),
			plan: {
				id: subscriber.plan.id,
				code: subscriber.plan.code,
				name: subscriber.plan.name,
				description: subscriber.plan.description,
				pricePaise: subscriber.plan.pricePaise,
				currency: subscriber.plan.currency,
				billingCycle: subscriber.plan.billingCycle,
				features: subscriber.plan.features,
				isActive: subscriber.plan.isActive,
			},
			transactions: subscriber.transactions.map((tx) => ({
				id: tx.id,
				amountPaise: tx.amountPaise,
				currency: tx.currency,
				status: tx.status,
				razorpayOrderId: tx.razorpayOrderId,
				razorpayPaymentId: tx.razorpayPaymentId,
				createdAt: tx.createdAt.toISOString(),
			})),
			invoices: subscriber.invoices.map((inv) => ({
				id: inv.id,
				invoiceNumber: inv.invoiceNumber,
				amountPaise: inv.amountPaise,
				currency: inv.currency,
				status: inv.status,
				paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
				createdAt: inv.createdAt.toISOString(),
			})),
		};
	}
}
