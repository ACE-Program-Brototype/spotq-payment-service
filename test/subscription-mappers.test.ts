import { SubscriptionOrderMapper } from '../src/application/mappers/subscriptions/subscription-order.mapper';
import { SubscriptionPlanMapper } from '../src/application/mappers/subscriptions/subscription-plan.mapper';
import {
	PlanBillingCycle,
	SubscriptionPlan,
} from '../src/domain/entities/subscription-plan.entity';

describe('SubscriptionOrderMapper & SubscriptionPlanMapper', () => {
	const plan = new SubscriptionPlan({
		id: 'plan-1',
		code: 'QUEUE_PRO',
		name: 'Queue Pro',
		description: 'Pro tier description',
		pricePaise: 149900,
		currency: 'INR',
		billingCycle: PlanBillingCycle.MONTHLY,
		features: ['Queue Management', 'SMS Alerts'],
		isActive: true,
	});

	it('maps subscription plan entities cleanly to SubscriptionPlanOutput DTOs', () => {
		const mapped = SubscriptionPlanMapper.toOutputList([plan]);

		expect(mapped).toEqual([
			{
				id: 'plan-1',
				code: 'QUEUE_PRO',
				name: 'Queue Pro',
				description: 'Pro tier description',
				pricePaise: 149900,
				priceInRupees: 1499,
				currency: 'INR',
				billingCycle: PlanBillingCycle.MONTHLY,
				features: ['Queue Management', 'SMS Alerts'],
				isActive: true,
			},
		]);
	});

	it('maps subscription order details into CreateSubscriptionOrderOutput DTO', () => {
		const mapped = SubscriptionOrderMapper.toOutputDTO({
			orderId: 'order_123',
			amountPaise: 149900,
			currency: 'INR',
			keyId: 'rzp_test_key',
			plan,
			restaurantName: 'Bistro One',
			restaurantEmail: 'owner@bistro.test',
			restaurantPhone: '+919999999999',
		});

		expect(mapped).toEqual({
			orderId: 'order_123',
			amount: 149900,
			currency: 'INR',
			keyId: 'rzp_test_key',
			plan: {
				id: 'plan-1',
				name: 'Queue Pro',
				code: 'QUEUE_PRO',
			},
			restaurant: {
				name: 'Bistro One',
				email: 'owner@bistro.test',
				phone: '+919999999999',
			},
		});
	});
});
