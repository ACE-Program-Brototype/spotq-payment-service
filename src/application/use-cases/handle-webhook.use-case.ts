import type {
	HandleWebhookInput,
	HandleWebhookOutput,
} from '@application/dtos/handle-webhook.dto.ts';
import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { IHandleWebhookUseCase } from '@application/ports/use-cases/handle-webhook.use-case.port.ts';
import { config } from '@config/index.ts';
import { TYPES } from '@di/types.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { inject, injectable } from 'inversify';
import { PaymentCapturedHandler } from './webhooks/payment-captured.handler.ts';
import { PaymentFailedHandler } from './webhooks/payment-failed.handler.ts';
import { PayoutWebhookHandler } from './webhooks/payout-webhook.handler.ts';
import { RefundWebhookHandler } from './webhooks/refund-webhook.handler.ts';
import type { IWebhookEventHandler } from './webhooks/webhook-event-handler.interface.ts';

/**
 * Use case responsible for processing external Razorpay webhook events,
 * verifying signatures, and dispatching events to dedicated strategy handlers.
 */
@injectable()
export class HandleWebhookUseCase implements IHandleWebhookUseCase {
	private readonly eventHandlers: Map<string, IWebhookEventHandler>;

	constructor(
		@inject(TYPES.Gateways.PaymentGateway)
		private readonly paymentGateway: IPaymentGateway,
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
		@inject(TYPES.Repositories.SubscriptionPlanRepository)
		private readonly planRepository: ISubscriptionPlanRepository,
		@inject(TYPES.Repositories.SubscriptionRepository)
		private readonly subscriptionRepository: ISubscriptionRepository,
		@inject(TYPES.Repositories.RestaurantWalletRepository)
		private readonly restaurantWalletRepository: IRestaurantWalletRepository,
		@inject(TYPES.Services.OutboxRelayService)
		private readonly outboxRelayService: IOutboxRelayService,
	) {
		this.eventHandlers = new Map();
		for (const handler of this.createEventHandlers()) {
			for (const eventType of handler.supportedEvents) {
				this.eventHandlers.set(eventType, handler);
			}
		}
	}

	async execute(params: HandleWebhookInput): Promise<HandleWebhookOutput> {
		if (!this.isValidSignature(params.rawBody, params.signature)) {
			return { received: false };
		}

		const eventType = params.parsedPayload.event;
		const paymentEntity = params.parsedPayload.payload?.payment?.entity;

		logger.info({ eventType, paymentId: paymentEntity?.id }, 'Processing Razorpay webhook event');

		const handler = this.eventHandlers.get(eventType);
		if (handler) {
			await handler.handle(eventType, params.parsedPayload);
		}

		return { received: true };
	}

	protected createEventHandlers(): IWebhookEventHandler[] {
		return [
			new PayoutWebhookHandler(this.restaurantWalletRepository),
			new PaymentCapturedHandler(
				this.paymentTransactionRepository,
				this.planRepository,
				this.subscriptionRepository,
				this.outboxRelayService,
			),
			new PaymentFailedHandler(this.paymentTransactionRepository, this.outboxRelayService),
			new RefundWebhookHandler(this.paymentTransactionRepository),
		];
	}

	private isValidSignature(rawBody: string, signature: string): boolean {
		const webhookSecret = config.razorpay.webhookSecret;
		if (!webhookSecret) {
			return true;
		}

		if (!signature) {
			logger.warn('Missing webhook signature rejected');
			return false;
		}

		const isValid = this.paymentGateway.verifyWebhookSignature(rawBody, signature, webhookSecret);
		if (!isValid) {
			logger.warn('Invalid webhook signature rejected');
			return false;
		}

		return true;
	}
}
