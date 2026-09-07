import { config } from '@config/index.ts';
import {
	ActiveSubscriptionAlreadyExistsError,
	PlanNotFoundError,
	UnauthorizedRestaurantError,
} from '@domain/errors/payment.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';

export interface CreateSubscriptionOrderInput {
	restaurantId: string;
	planId: string;
	restaurantName?: string;
	restaurantEmail?: string;
	restaurantPhone?: string;
}

export interface CreateSubscriptionOrderOutput {
	orderId: string;
	amount: number;
	currency: string;
	keyId: string;
	plan: {
		id: string;
		name: string;
		code: string;
	};
	restaurant: {
		name?: string;
		email?: string;
		phone?: string;
	};
}

export class CreateSubscriptionOrderUseCase {
	constructor(
		private readonly planRepository: ISubscriptionPlanRepository,
		private readonly subscriptionRepository: ISubscriptionRepository,
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
		private readonly paymentGateway: IPaymentGateway,
	) {}

	async execute(input: CreateSubscriptionOrderInput): Promise<CreateSubscriptionOrderOutput> {
		if (!input.restaurantId) {
			throw new UnauthorizedRestaurantError();
		}

		// 1. Verify plan exists
		const plan = await this.planRepository.findById(input.planId);
		if (!plan?.isActive) {
			throw new PlanNotFoundError();
		}

		// 2. Check if restaurant already has active subscription
		const existingSub = await this.subscriptionRepository.findActiveByRestaurantId(
			input.restaurantId,
		);
		if (existingSub?.isActive()) {
			throw new ActiveSubscriptionAlreadyExistsError();
		}

		// 3. Idempotency check: Reuse existing active CREATED order within 15 mins if available
		const existingPendingTx =
			await this.paymentTransactionRepository.findPendingByRestaurantAndPlan(
				input.restaurantId,
				plan.id,
			);

		if (existingPendingTx) {
			logger.info(
				{ orderId: existingPendingTx.razorpayOrderId, restaurantId: input.restaurantId },
				'Reusing existing pending Razorpay order',
			);

			return {
				orderId: existingPendingTx.razorpayOrderId,
				amount: existingPendingTx.amountPaise,
				currency: existingPendingTx.currency,
				keyId: config.razorpay.keyId,
				plan: {
					id: plan.id,
					name: plan.name,
					code: plan.code,
				},
				restaurant: {
					name: input.restaurantName,
					email: input.restaurantEmail,
					phone: input.restaurantPhone,
				},
			};
		}

		// 4. Create new Razorpay order
		const receiptId = `rcpt_${input.restaurantId.replace(/-/g, '').slice(0, 10)}_${Date.now()}`;
		const orderResult = await this.paymentGateway.createOrder({
			amountInPaise: plan.pricePaise,
			currency: plan.currency,
			receiptId,
			notes: {
				restaurantId: input.restaurantId,
				planId: plan.id,
				planCode: plan.code,
			},
		});

		// 5. Store payment transaction record
		await this.paymentTransactionRepository.create({
			restaurantId: input.restaurantId,
			planId: plan.id,
			razorpayOrderId: orderResult.orderId,
			amountPaise: plan.pricePaise,
			currency: plan.currency,
			status: 'CREATED',
			metadata: {
				receiptId,
				planName: plan.name,
				planCode: plan.code,
			},
		});

		logger.info(
			{ orderId: orderResult.orderId, restaurantId: input.restaurantId, planId: plan.id },
			'Created new subscription payment order',
		);

		return {
			orderId: orderResult.orderId,
			amount: plan.pricePaise,
			currency: plan.currency,
			keyId: config.razorpay.keyId,
			plan: {
				id: plan.id,
				name: plan.name,
				code: plan.code,
			},
			restaurant: {
				name: input.restaurantName,
				email: input.restaurantEmail,
				phone: input.restaurantPhone,
			},
		};
	}
}
