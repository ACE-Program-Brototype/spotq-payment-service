import type { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import type { Subscription } from '@domain/entities/subscription.entity.ts';
import type { SubscriptionPlan } from '@domain/entities/subscription-plan.entity.ts';
import { SubscriptionNotFoundError } from '@domain/errors/payment.errors.ts';
import type {
	ActivateSubscriptionOutboxPayload,
	ISubscriptionRepository,
} from '@domain/repositories/subscription.repository.interface.ts';
import { SUBSCRIPTION_EVENTS, SUBSCRIPTION_STATUS } from '@shared/constants/index.ts';

export interface ActivateOrRenewSubscriptionParams {
	subscriptionRepository: ISubscriptionRepository;
	transaction: PaymentTransaction;
	plan: SubscriptionPlan;
	razorpayPaymentId: string;
	razorpaySignature: string;
	now?: Date;
	throwIfRenewalTargetMissing?: boolean;
}

function buildSubscriptionActivatedOutbox(
	transaction: PaymentTransaction,
	plan: SubscriptionPlan,
	currentPeriodStart: Date,
	currentPeriodEnd: Date,
	now: Date,
	subscriptionId?: string,
): {
	eventType: string;
	aggregateId: string;
	payload: ActivateSubscriptionOutboxPayload;
} {
	return {
		eventType: SUBSCRIPTION_EVENTS.ACTIVATED,
		aggregateId: transaction.restaurantId,
		payload: {
			restaurantId: transaction.restaurantId,
			planCode: plan.tierCode,
			status: SUBSCRIPTION_STATUS.ACTIVE,
			currentPeriodStart: currentPeriodStart.toISOString(),
			currentPeriodEnd: currentPeriodEnd.toISOString(),
			timestamp: now.toISOString(),
			...(subscriptionId ? { subscriptionId } : {}),
		},
	};
}

/**
 * Shared domain workflow that either renews an existing target subscription
 * or activates a new subscription alongside the corresponding outbox event.
 */
export async function activateOrRenewSubscription(
	params: ActivateOrRenewSubscriptionParams & { throwIfRenewalTargetMissing: true },
): Promise<Subscription>;
export async function activateOrRenewSubscription(
	params: ActivateOrRenewSubscriptionParams,
): Promise<Subscription | null>;
export async function activateOrRenewSubscription(
	params: ActivateOrRenewSubscriptionParams,
): Promise<Subscription | null> {
	const now = params.now ?? new Date();
	const { subscriptionRepository, transaction, plan, razorpayPaymentId, razorpaySignature } =
		params;
	const targetSubscriptionId = transaction.renewalTargetSubscriptionId;

	if (transaction.isSubscriptionRenewal() && targetSubscriptionId) {
		const targetSub = await subscriptionRepository.findById(targetSubscriptionId);
		if (!targetSub) {
			if (params.throwIfRenewalTargetMissing) {
				throw new SubscriptionNotFoundError();
			}
			return null;
		}

		const renewalPeriod = targetSub.calculateRenewalPeriod(plan, now);

		return subscriptionRepository.renewSubscriptionWithOutbox({
			subscription: {
				subscriptionId: targetSub.id,
				restaurantId: transaction.restaurantId,
				planId: plan.id,
				status: SUBSCRIPTION_STATUS.ACTIVE,
				currentPeriodStart: renewalPeriod.currentPeriodStart,
				currentPeriodEnd: renewalPeriod.currentPeriodEnd,
			},
			payment: {
				razorpayOrderId: transaction.razorpayOrderId,
				razorpayPaymentId,
				razorpaySignature,
			},
			outbox: buildSubscriptionActivatedOutbox(
				transaction,
				plan,
				renewalPeriod.currentPeriodStart,
				renewalPeriod.currentPeriodEnd,
				now,
				targetSub.id,
			),
		});
	}

	const currentPeriodEnd = plan.calculatePeriodEnd(now);

	return subscriptionRepository.activateSubscriptionWithOutbox({
		subscription: {
			restaurantId: transaction.restaurantId,
			planId: plan.id,
			status: SUBSCRIPTION_STATUS.ACTIVE,
			currentPeriodStart: now,
			currentPeriodEnd,
		},
		payment: {
			razorpayOrderId: transaction.razorpayOrderId,
			razorpayPaymentId,
			razorpaySignature,
		},
		outbox: buildSubscriptionActivatedOutbox(transaction, plan, now, currentPeriodEnd, now),
	});
}
