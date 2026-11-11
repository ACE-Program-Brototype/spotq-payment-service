import type { CreateSubscriptionOrderOutput } from '@application/dtos/create-subscription-order.dto.ts';
import type { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';

export interface ToSubscriptionOrderOutputParams {
	orderId: string;
	amountPaise: number;
	currency: string;
	keyId: string;
	plan: SubscriptionPlan;
	restaurantName?: string;
	restaurantEmail?: string;
	restaurantPhone?: string;
}

/**
 * Application mapper converting subscription order and plan data into DTO responses.
 */
export const SubscriptionOrderMapper = {
	toOutputDTO(params: ToSubscriptionOrderOutputParams): CreateSubscriptionOrderOutput {
		return {
			orderId: params.orderId,
			amount: params.amountPaise,
			currency: params.currency,
			keyId: params.keyId,
			plan: {
				id: params.plan.id,
				name: params.plan.name,
				code: params.plan.code,
			},
			restaurant: {
				name: params.restaurantName,
				email: params.restaurantEmail,
				phone: params.restaurantPhone,
			},
		};
	},
};
