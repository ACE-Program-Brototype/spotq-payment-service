import { TYPES } from '@di/types.ts';
import type {
	ISubscriptionEventProducer,
	SubscriptionActivatedEventPayload,
	SubscriptionExpiredEventPayload,
} from '@domain/interfaces/subscription-event-producer.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import type { RabbitMQService } from '@infrastructure/rabbitmq/rabbitmq.client.ts';
import { MESSAGES, RABBITMQ_QUEUES, SUBSCRIPTION_EVENTS } from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

export type { SubscriptionActivatedEventPayload, SubscriptionExpiredEventPayload };
export { RABBITMQ_QUEUES };
export const SUBSCRIPTION_EVENTS_QUEUE = RABBITMQ_QUEUES.SUBSCRIPTION_EVENTS;
export const SUBSCRIPTION_ACTIVATED_EVENT = SUBSCRIPTION_EVENTS.ACTIVATED;
export const SUBSCRIPTION_EXPIRED_EVENT = SUBSCRIPTION_EVENTS.EXPIRED;

@injectable()
export class SubscriptionEventProducer implements ISubscriptionEventProducer {
	constructor(
		@inject(TYPES.Services.RabbitMQService)
		private readonly rabbitMQService: RabbitMQService,
	) {}

	async publishSubscriptionActivated(payload: SubscriptionActivatedEventPayload): Promise<void> {
		try {
			const message = {
				...payload,
				eventType: SUBSCRIPTION_ACTIVATED_EVENT,
				aggregateId: payload.restaurantId,
			};

			const published = await this.rabbitMQService.publishToQueue(
				RABBITMQ_QUEUES.SUBSCRIPTION_EVENTS,
				message,
				{ persistent: true },
			);

			if (!published) {
				throw new Error(
					`${MESSAGES.RABBITMQ_PUBLISH_FAILED} '${RABBITMQ_QUEUES.SUBSCRIPTION_EVENTS}' for event '${SUBSCRIPTION_ACTIVATED_EVENT}'`,
				);
			}

			logger.info(
				{
					eventId: payload.eventId,
					restaurantId: payload.restaurantId,
					planCode: payload.planCode,
				},
				'Published subscription.activated event to RabbitMQ',
			);
		} catch (error) {
			logger.error(
				{ err: error, payload },
				'Failed to publish subscription.activated event to RabbitMQ',
			);
			throw error;
		}
	}

	async publishSubscriptionExpired(payload: SubscriptionExpiredEventPayload): Promise<void> {
		try {
			const message = {
				...payload,
				eventType: SUBSCRIPTION_EXPIRED_EVENT,
				aggregateId: payload.restaurantId,
			};

			const published = await this.rabbitMQService.publishToQueue(
				RABBITMQ_QUEUES.SUBSCRIPTION_EVENTS,
				message,
				{ persistent: true },
			);

			if (!published) {
				throw new Error(
					`${MESSAGES.RABBITMQ_PUBLISH_FAILED} '${RABBITMQ_QUEUES.SUBSCRIPTION_EVENTS}' for event '${SUBSCRIPTION_EXPIRED_EVENT}'`,
				);
			}

			logger.info(
				{
					eventId: payload.eventId,
					restaurantId: payload.restaurantId,
					planCode: payload.planCode,
				},
				'Published subscription.expired event to RabbitMQ',
			);
		} catch (error) {
			logger.error(
				{ err: error, payload },
				'Failed to publish subscription.expired event to RabbitMQ',
			);
			throw error;
		}
	}
}
