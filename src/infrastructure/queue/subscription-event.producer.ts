import { config } from '@config/index.ts';
import type {
	ISubscriptionEventProducer,
	SubscriptionActivatedEventPayload,
} from '@domain/interfaces/subscription-event-producer.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { Queue } from 'bullmq';
import { injectable } from 'inversify';

export type { SubscriptionActivatedEventPayload };
export const SUBSCRIPTION_EVENTS_QUEUE = 'restaurant-subscription-events';
export const SUBSCRIPTION_ACTIVATED_EVENT = 'subscription.activated';

@injectable()
export class SubscriptionEventProducer implements ISubscriptionEventProducer {
	private queue: Queue | null = null;

	private getQueue(): Queue {
		if (!this.queue) {
			const isTls = config.redis.url.startsWith('rediss://');
			const parsedUrl = new URL(config.redis.url);

			this.queue = new Queue(SUBSCRIPTION_EVENTS_QUEUE, {
				connection: {
					host: parsedUrl.hostname,
					port: Number(parsedUrl.port) || 6379,
					password: parsedUrl.password || undefined,
					username: parsedUrl.username || undefined,
					tls: isTls ? {} : undefined,
					maxRetriesPerRequest: null,
					enableReadyCheck: false,
				},
				prefix: 'bull',
			});
		}
		return this.queue;
	}

	async publishSubscriptionActivated(payload: SubscriptionActivatedEventPayload): Promise<void> {
		try {
			const queue = this.getQueue();
			await queue.add(SUBSCRIPTION_ACTIVATED_EVENT, payload, {
				jobId: payload.eventId,
				attempts: 5,
				backoff: {
					type: 'exponential',
					delay: 2000,
				},
				removeOnComplete: 1000,
				removeOnFail: false,
			});

			logger.info(
				{
					eventId: payload.eventId,
					restaurantId: payload.restaurantId,
					planCode: payload.planCode,
				},
				'Published subscription.activated event to BullMQ',
			);
		} catch (error) {
			logger.error(
				{ err: error, payload },
				'Failed to publish subscription.activated event to BullMQ',
			);
			throw error;
		}
	}

	async close(): Promise<void> {
		if (this.queue) {
			await this.queue.close();
			this.queue = null;
		}
	}
}
