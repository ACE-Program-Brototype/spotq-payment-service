import crypto from 'node:crypto';
import type {
	RenewSubscriptionInputDTO,
	RenewSubscriptionOutputDTO,
} from '@application/dtos/subscriptions/renew-subscription.dto.ts';
import { RenewSubscriptionMapper } from '@application/mappers/subscriptions/renew-subscription.mapper.ts';
import type { IIdempotencyService } from '@application/ports/services/idempotency.service.port.ts';
import type { IRenewSubscriptionUseCase } from '@application/ports/use-cases/subscriptions/renew-subscription.use-case.port.ts';
import { config } from '@config/index.ts';
import { TYPES } from '@di/types.ts';
import { RENEWAL_NOTE_FLAG } from '@domain/constants/subscription.constants.ts';
import type { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import {
	IdempotencyKeyPayloadMismatchError,
	IdempotencyRequestInProgressError,
	MissingIdempotencyKeyError,
	PaymentGatewayUnavailableError,
	PlanNotFoundError,
	RenewalAlreadyInProgressError,
	SubscriptionNotFoundError,
	UnauthorizedRestaurantError,
} from '@domain/errors/payment.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IBillingInvoiceRepository } from '@domain/repositories/billing-invoice.repository.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { InvoiceNumber, ReceiptId } from '@domain/value-objects/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	IDEMPOTENCY_CLAIM_STATUS,
	IDEMPOTENCY_COMPLETED_TTL_SECONDS,
	IDEMPOTENCY_IN_PROGRESS_TTL_SECONDS,
	IDEMPOTENCY_REDIS_PREFIXES,
	INVOICE_STATUS,
	PAYMENT_STATUS,
	SUBSCRIPTION_RENEWAL_LOCK_TTL_SECONDS,
} from '@shared/constants/index.ts';
import { inject, injectable, optional } from 'inversify';

@injectable()
export class RenewSubscriptionUseCase implements IRenewSubscriptionUseCase {
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
		@inject(TYPES.Services.IdempotencyService)
		@optional()
		private readonly idempotencyService?: IIdempotencyService,
	) {}

	async execute(input: RenewSubscriptionInputDTO): Promise<RenewSubscriptionOutputDTO> {
		if (!input.restaurantId) {
			throw new UnauthorizedRestaurantError();
		}

		const normalizedIdempotencyKey = input.idempotencyKey?.trim();
		if (!normalizedIdempotencyKey) {
			throw new MissingIdempotencyKeyError();
		}

		const payloadHash = this.computePayloadHash(input.subscriptionId, input.planId);
		const scopeKey = `${IDEMPOTENCY_REDIS_PREFIXES.SUBSCRIPTION_RENEW}:${input.restaurantId}:${input.subscriptionId}:${normalizedIdempotencyKey}`;

		let claimToken: string | null = null;

		if (this.idempotencyService) {
			const claim = await this.idempotencyService.claimOrGet<RenewSubscriptionOutputDTO>(
				scopeKey,
				payloadHash,
				IDEMPOTENCY_IN_PROGRESS_TTL_SECONDS,
			);

			if (claim.status === IDEMPOTENCY_CLAIM_STATUS.PAYLOAD_MISMATCH) {
				throw new IdempotencyKeyPayloadMismatchError();
			}

			if (claim.status === IDEMPOTENCY_CLAIM_STATUS.IN_PROGRESS) {
				throw new IdempotencyRequestInProgressError();
			}

			if (claim.status === IDEMPOTENCY_CLAIM_STATUS.REPLAY) {
				logger.info(
					{
						subscriptionId: input.subscriptionId,
						restaurantId: input.restaurantId,
						orderId: claim.response.orderId,
					},
					'Replaying cached subscription renewal response from Idempotency-Key',
				);
				return {
					...claim.response,
					replayed: true,
				};
			}

			claimToken = claim.claimToken;
		}

		try {
			const lockToken = this.idempotencyService
				? await this.idempotencyService.acquireSubscriptionLock(
						input.subscriptionId,
						SUBSCRIPTION_RENEWAL_LOCK_TTL_SECONDS,
					)
				: 'unmanaged-lock';

			if (!lockToken) {
				throw new RenewalAlreadyInProgressError();
			}

			try {
				const outputDto = await this.executeLockedRenewal(input, normalizedIdempotencyKey);

				if (this.idempotencyService) {
					await this.idempotencyService.complete(
						scopeKey,
						payloadHash,
						outputDto,
						IDEMPOTENCY_COMPLETED_TTL_SECONDS,
					);
				}

				return outputDto;
			} finally {
				if (this.idempotencyService) {
					await this.idempotencyService.releaseSubscriptionLock(input.subscriptionId, lockToken);
				}
			}
		} catch (error) {
			if (this.idempotencyService && claimToken) {
				await this.idempotencyService.releaseClaim(scopeKey, claimToken);
			}
			throw error;
		}
	}

	private async executeLockedRenewal(
		input: RenewSubscriptionInputDTO,
		idempotencyKey: string,
	): Promise<RenewSubscriptionOutputDTO> {
		const subscription = await this.subscriptionRepository.findById(input.subscriptionId);
		if (!subscription) {
			throw new SubscriptionNotFoundError();
		}

		subscription.assertOwnedByRestaurant(input.restaurantId);
		subscription.assertEligibleForRenewal();

		const targetPlanId = input.planId || subscription.planId;
		const plan = await this.planRepository.findById(targetPlanId);
		if (!plan?.isActive) {
			throw new PlanNotFoundError();
		}

		const existingPendingTx =
			await this.paymentTransactionRepository.findPendingRenewalBySubscriptionAndPlan(
				subscription.id,
				plan.id,
			);

		if (existingPendingTx) {
			if (existingPendingTx.isFailed()) {
				await this.paymentTransactionRepository.resetToCreated(existingPendingTx.razorpayOrderId);
				logger.info(
					{ orderId: existingPendingTx.razorpayOrderId, subscriptionId: subscription.id },
					'Reset failed renewal transaction to CREATED for retry attempt',
				);
			}

			if (this.billingInvoiceRepository) {
				const existingInvoice = await this.billingInvoiceRepository.findByPaymentTransactionId(
					existingPendingTx.id,
				);
				if (!existingInvoice) {
					await this.billingInvoiceRepository.create({
						restaurantId: input.restaurantId,
						subscriptionId: subscription.id,
						paymentTransactionId: existingPendingTx.id,
						invoiceNumber: InvoiceNumber.generate(),
						amountPaise: existingPendingTx.amountPaise,
						currency: existingPendingTx.currency,
						status: INVOICE_STATUS.DRAFT,
					});
					logger.info(
						{
							transactionId: existingPendingTx.id,
							subscriptionId: subscription.id,
						},
						'Created missing draft billing invoice for reused renewal transaction',
					);
				}
			}

			logger.info(
				{ orderId: existingPendingTx.razorpayOrderId, subscriptionId: subscription.id },
				'Reusing existing pending renewal Razorpay order',
			);

			return RenewSubscriptionMapper.toOutputDTO({
				orderId: existingPendingTx.razorpayOrderId,
				amountPaise: existingPendingTx.amountPaise,
				currency: existingPendingTx.currency,
				keyId: config.razorpay.keyId,
				plan,
				subscription,
				restaurantName: input.restaurantName,
				restaurantEmail: input.restaurantEmail,
				restaurantPhone: input.restaurantPhone,
			});
		}

		if (!this.paymentGateway.isHealthy()) {
			throw new PaymentGatewayUnavailableError();
		}

		const receiptId = ReceiptId.forSubscription(input.restaurantId);
		const gatewayOrder = await this.createGatewayOrderWithFallback({
			amountInPaise: plan.pricePaise,
			currency: plan.currency,
			receiptId,
			restaurantId: input.restaurantId,
			subscriptionId: subscription.id,
			planId: plan.id,
			planCode: plan.code,
		});

		const invoiceNumber = InvoiceNumber.generate();
		let transactionRecord: PaymentTransaction;

		if (this.paymentTransactionRepository.createRenewalWithInvoice) {
			transactionRecord = await this.paymentTransactionRepository.createRenewalWithInvoice({
				transaction: {
					restaurantId: input.restaurantId,
					subscriptionId: subscription.id,
					planId: plan.id,
					razorpayOrderId: gatewayOrder.orderId,
					amountPaise: plan.pricePaise,
					currency: plan.currency,
					status: PAYMENT_STATUS.CREATED,
					metadata: {
						receiptId,
						isRenewal: true,
						targetSubscriptionId: subscription.id,
						planName: plan.name,
						planCode: plan.code,
						idempotencyKey,
					},
				},
				invoice: {
					invoiceNumber,
					status: INVOICE_STATUS.DRAFT,
				},
			});
		} else {
			transactionRecord = await this.paymentTransactionRepository.create({
				restaurantId: input.restaurantId,
				subscriptionId: subscription.id,
				planId: plan.id,
				razorpayOrderId: gatewayOrder.orderId,
				amountPaise: plan.pricePaise,
				currency: plan.currency,
				status: PAYMENT_STATUS.CREATED,
				metadata: {
					receiptId,
					isRenewal: true,
					targetSubscriptionId: subscription.id,
					planName: plan.name,
					planCode: plan.code,
					idempotencyKey,
				},
			});

			if (this.billingInvoiceRepository) {
				await this.billingInvoiceRepository.create({
					restaurantId: input.restaurantId,
					subscriptionId: subscription.id,
					paymentTransactionId: transactionRecord.id,
					invoiceNumber,
					amountPaise: plan.pricePaise,
					currency: plan.currency,
					status: INVOICE_STATUS.DRAFT,
				});
			}
		}

		logger.info(
			{
				orderId: gatewayOrder.orderId,
				restaurantId: input.restaurantId,
				subscriptionId: subscription.id,
				planId: plan.id,
			},
			'Created new subscription renewal payment order',
		);

		return RenewSubscriptionMapper.toOutputDTO({
			orderId: gatewayOrder.orderId,
			amountPaise: plan.pricePaise,
			currency: plan.currency,
			keyId: config.razorpay.keyId,
			plan,
			subscription,
			restaurantName: input.restaurantName,
			restaurantEmail: input.restaurantEmail,
			restaurantPhone: input.restaurantPhone,
		});
	}

	private computePayloadHash(subscriptionId: string, planId?: string): string {
		return crypto
			.createHash('sha256')
			.update(
				JSON.stringify({
					subscriptionId,
					planId: planId ?? 'CURRENT',
				}),
			)
			.digest('hex');
	}

	private async createGatewayOrderWithFallback(params: {
		amountInPaise: number;
		currency: string;
		receiptId: string;
		restaurantId: string;
		subscriptionId: string;
		planId: string;
		planCode: string;
	}) {
		try {
			return await this.paymentGateway.createOrder({
				amountInPaise: params.amountInPaise,
				currency: params.currency,
				receiptId: params.receiptId,
				notes: {
					restaurantId: params.restaurantId,
					subscriptionId: params.subscriptionId,
					planId: params.planId,
					planCode: params.planCode,
					isRenewal: RENEWAL_NOTE_FLAG,
				},
			});
		} catch (error) {
			logger.error(
				{ err: error, subscriptionId: params.subscriptionId, planId: params.planId },
				'Failed to create renewal order with payment gateway',
			);
			throw new PaymentGatewayUnavailableError();
		}
	}
}
