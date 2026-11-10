import type { RenewSubscriptionOutputDTO } from '@application/dtos/subscriptions/renew-subscription.dto.ts';
import type { Subscription } from '@domain/entities/subscription.entity.ts';
import type { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import { SUBSCRIPTION_RENEWAL_WINDOW_DAYS } from '@shared/constants/index.ts';

export interface ToRenewSubscriptionOutputParams {
	orderId: string;
	amountPaise: number;
	currency: string;
	keyId: string;
	plan: SubscriptionPlan;
	subscription: Subscription;
	restaurantName?: string;
	restaurantEmail?: string;
	restaurantPhone?: string;
}

export const RenewSubscriptionMapper = {
	toOutputDTO(params: ToRenewSubscriptionOutputParams): RenewSubscriptionOutputDTO {
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
			subscription: {
				id: params.subscription.id,
				currentStatus: params.subscription.status,
				currentPeriodEnd: params.subscription.currentPeriodEnd.toISOString(),
				renewalWindowDays: SUBSCRIPTION_RENEWAL_WINDOW_DAYS,
				isRenewal: true,
			},
			restaurant: {
				name: params.restaurantName,
				email: params.restaurantEmail,
				phone: params.restaurantPhone,
			},
		};
	},
};
