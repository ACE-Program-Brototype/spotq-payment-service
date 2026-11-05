import type { RestaurantInfoDTO } from '@application/dtos/external/restaurant-info.dto.ts';
import type {
	AdminSubscriberDetailsOutputDTO,
	AdminSubscriberSummaryDTO,
	ListAdminSubscribersOutputDTO,
} from '@application/dtos/index.ts';
import type {
	PaginatedSubscribersResult,
	SubscriberDetail,
	SubscriberSummary,
} from '@domain/types/subscriber-query.types.ts';

export const AdminSubscriberMapper = {
	toSummaryDto(
		sub: SubscriberSummary,
		restaurantInfo?: RestaurantInfoDTO | null,
	): AdminSubscriberSummaryDTO {
		return {
			id: sub.id,
			subscriberId: sub.id,
			restaurantId: sub.restaurantId,
			restaurantName: restaurantInfo?.restaurantName ?? null,
			subscriberName: restaurantInfo?.ownerName ?? null,
			subscriberEmail: restaurantInfo?.ownerEmail ?? null,
			restaurantStatus: restaurantInfo?.status ?? null,
			isRestaurantBlocked: restaurantInfo?.isBlocked ?? false,
			planId: sub.planId,
			status: sub.status,
			currentPeriodStart: sub.currentPeriodStart.toISOString(),
			currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
			canceledAt: sub.canceledAt ? sub.canceledAt.toISOString() : null,
			createdAt: sub.createdAt.toISOString(),
			updatedAt: sub.updatedAt.toISOString(),
			plan: {
				id: sub.plan.id,
				planId: sub.plan.id,
				code: sub.plan.code,
				name: sub.plan.name,
				description: sub.plan.description,
				pricePaise: sub.plan.pricePaise,
				currency: sub.plan.currency,
				billingCycle: sub.plan.billingCycle,
				features: sub.plan.features,
				isActive: sub.plan.isActive,
			},
		};
	},

	toListDto(
		result: PaginatedSubscribersResult,
		restaurantMap?: Map<string, RestaurantInfoDTO>,
	): ListAdminSubscribersOutputDTO {
		return {
			subscribers: result.subscribers.map((sub) =>
				this.toSummaryDto(sub, restaurantMap?.get(sub.restaurantId)),
			),
			pagination: result.pagination,
		};
	},

	toDetailsDto(
		subscriber: SubscriberDetail,
		restaurantInfo?: RestaurantInfoDTO | null,
	): AdminSubscriberDetailsOutputDTO {
		return {
			...this.toSummaryDto(subscriber, restaurantInfo),
			transactions: subscriber.transactions.map((tx) => ({
				id: tx.id,
				transactionId: tx.id,
				amountPaise: tx.amountPaise,
				currency: tx.currency,
				status: tx.status,
				razorpayOrderId: tx.razorpayOrderId,
				razorpayPaymentId: tx.razorpayPaymentId,
				createdAt: tx.createdAt.toISOString(),
			})),
			invoices: subscriber.invoices.map((inv) => ({
				id: inv.id,
				invoiceId: inv.id,
				invoiceNumber: inv.invoiceNumber,
				amountPaise: inv.amountPaise,
				currency: inv.currency,
				status: inv.status,
				paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
				createdAt: inv.createdAt.toISOString(),
			})),
		};
	},
};
