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
	toSummaryDto(sub: SubscriberSummary): AdminSubscriberSummaryDTO {
		return {
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
		};
	},

	toListDto(result: PaginatedSubscribersResult): ListAdminSubscribersOutputDTO {
		return {
			subscribers: result.subscribers.map((sub) => this.toSummaryDto(sub)),
			pagination: result.pagination,
		};
	},

	toDetailsDto(subscriber: SubscriberDetail): AdminSubscriberDetailsOutputDTO {
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
	},
};
