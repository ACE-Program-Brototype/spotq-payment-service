import type {
	CreateSubscriptionOrderInput,
	CreateSubscriptionOrderOutput,
} from '@application/dtos/create-subscription-order.dto.ts';
import type { ICreateSubscriptionOrderUseCase } from '@application/ports/use-cases/create-subscription-order.use-case.port.ts';
import { config } from '@config/index.ts';
import { TYPES } from '@di/types.ts';
import {
	ActiveSubscriptionAlreadyExistsError,
	PlanNotFoundError,
	UnauthorizedRestaurantError,
} from '@domain/errors/payment.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IBillingInvoiceRepository } from '@domain/repositories/billing-invoice.repository.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { PAYMENT_STATUS } from '@shared/constants/index.ts';
import { inject, injectable, optional } from 'inversify';

/**
 * Use case responsible for validating subscription plan eligibility,
 * creating Razorpay payment orders idempotently, and persisting transactions.
 */
@injectable()
export class CreateSubscriptionOrderUseCase implements ICreateSubscriptionOrderUseCase {
	constructor(
		@inject(TYPES.Repositories.SubscriptionPlanRepository)
		private readonly planRepository: ISubscriptionPlanRepository,
		@inject(TYPES.Repositories.SubscriptionRepository)
		private readonly subscriptionRepository: ISubscriptionRepository,
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
		@inject(TYPES.Gateways.PaymentGateway)
		private readonly paymentGateway: IPaymentGateway,
		@inject(TYPES.Repositories.BillingInvoiceRepository)
		@optional()
		private readonly billingInvoiceRepository?: IBillingInvoiceRepository,
	) {}

	async execute(input: CreateSubscriptionOrderInput): Promise<CreateSubscriptionOrderOutput> {
		if (!input.restaurantId) {
			throw new UnauthorizedRestaurantError();
		}

		const plan = await this.planRepository.findById(input.planId);
		if (!plan?.isActive) {
			throw new PlanNotFoundError();
		}

		const existingSub = await this.subscriptionRepository.findActiveByRestaurantId(
			input.restaurantId,
		);
		if (existingSub?.isActive()) {
			throw new ActiveSubscriptionAlreadyExistsError();
		}

		const existingPendingTx =
			await this.paymentTransactionRepository.findPendingByRestaurantAndPlan(
				input.restaurantId,
				plan.id,
			);

		if (existingPendingTx) {
			if (existingPendingTx.status === PAYMENT_STATUS.FAILED) {
				await this.paymentTransactionRepository.resetToCreated(existingPendingTx.razorpayOrderId);
				logger.info(
					{ orderId: existingPendingTx.razorpayOrderId, restaurantId: input.restaurantId },
					'Resetting failed transaction to CREATED for retry attempt',
				);
			}

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

		const txRecord = await this.paymentTransactionRepository.create({
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

		const invoiceRepo = this.billingInvoiceRepository;
		if (invoiceRepo) {
			const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
			await invoiceRepo.create({
				restaurantId: input.restaurantId,
				paymentTransactionId: txRecord.id,
				invoiceNumber,
				amountPaise: plan.pricePaise,
				currency: plan.currency,
				status: 'DRAFT',
			});
		}

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
