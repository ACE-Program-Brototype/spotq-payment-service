import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import { TYPES } from '@di/types.ts';
import type {
	ISubscriptionEventProducer,
	SubscriptionActivatedEventPayload,
	SubscriptionExpiredEventPayload,
} from '@domain/interfaces/subscription-event-producer.interface.ts';
import type { IOutboxRepository } from '@domain/repositories/outbox.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	redisService as defaultRedisService,
	type RedisService,
} from '@infrastructure/redis/index.ts';
import { SUBSCRIPTION_EVENTS } from '@shared/constants/index.ts';
import { inject, injectable, unmanaged } from 'inversify';

export const MAX_OUTBOX_RETRIES = 5;
export const BASE_RETRY_BACKOFF_MS = 2000;

/**
 * Service responsible for polling pending transactional outbox events
 * and publishing them to message brokers reliably.
 */
@injectable()
export class OutboxRelayService implements IOutboxRelayService {
	private intervalId: NodeJS.Timeout | null = null;
	private isProcessing = false;
	private readonly redisService: RedisService;

	constructor(
		@inject(TYPES.Repositories.OutboxRepository)
		private readonly outboxRepository: IOutboxRepository,
		@inject(TYPES.Services.SubscriptionEventProducer)
		private readonly eventProducer: ISubscriptionEventProducer,
		@unmanaged()
		redisService?: RedisService,
	) {
		this.redisService = redisService ?? defaultRedisService;
	}

	start(pollIntervalMs = 5000): void {
		if (this.intervalId) return;

		this.intervalId = setInterval(() => {
			this.processPendingEvents().catch((err) => {
				logger.error({ err }, 'Error in OutboxRelayService loop');
			});
		}, pollIntervalMs);

		logger.info(
			{ pollIntervalMs, maxRetries: MAX_OUTBOX_RETRIES },
			'OutboxRelayService background worker started',
		);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			logger.info('OutboxRelayService background worker stopped');
		}
	}

	async processPendingEvents(): Promise<void> {
		if (this.isProcessing) return;

		const hasLock = await this.redisService.acquireLock('lock:outbox-relay', 10);
		if (!hasLock) {
			logger.debug('Another pod is currently processing outbox events, skipping cycle');
			return;
		}

		this.isProcessing = true;

		try {
			const pendingEvents = await this.outboxRepository.findPendingEvents(20);

			for (const event of pendingEvents) {
				try {
					if (event.eventType === SUBSCRIPTION_EVENTS.ACTIVATED) {
						const payload = event.payload as unknown as SubscriptionActivatedEventPayload;
						await this.eventProducer.publishSubscriptionActivated({
							...payload,
							eventId: event.id,
						});
					} else if (event.eventType === SUBSCRIPTION_EVENTS.EXPIRED) {
						const payload = event.payload as unknown as SubscriptionExpiredEventPayload;
						await this.eventProducer.publishSubscriptionExpired({
							...payload,
							eventId: event.id,
						});
					} else {
						logger.warn(
							{ eventId: event.id, eventType: event.eventType },
							'Unhandled outbox event type encountered',
						);
					}

					await this.outboxRepository.markPublished(event.id);
					logger.debug(
						{ eventId: event.id, eventType: event.eventType },
						'Outbox event published successfully',
					);
				} catch (err: unknown) {
					const errorMsg = err instanceof Error ? err.message : 'Unknown outbox publishing error';
					const { isDeadLetter, retryCount } = await this.outboxRepository.recordFailure(
						event.id,
						errorMsg,
						MAX_OUTBOX_RETRIES,
					);

					if (isDeadLetter) {
						logger.error(
							{
								eventId: event.id,
								eventType: event.eventType,
								aggregateId: event.aggregateId,
								retryCount,
								error: errorMsg,
							},
							'🚨 [DEAD_LETTER_EVENT_ALERT] Outbox event exceeded max retries and moved to FAILED (Dead-Letter queue). Manual investigation required.',
						);
					} else {
						logger.warn(
							{
								eventId: event.id,
								retryCount,
								maxRetries: MAX_OUTBOX_RETRIES,
								error: errorMsg,
							},
							'Outbox dispatch failed, scheduled for retry',
						);
					}
				}
			}
		} finally {
			this.isProcessing = false;
			await this.redisService.releaseLock('lock:outbox-relay');
		}
	}

	async replayDeadLetterEvent(id: string): Promise<void> {
		const replayed = await this.outboxRepository.replayDeadLetter(id);
		logger.info(
			{ eventId: replayed.id, eventType: replayed.eventType },
			'Replayed dead-letter outbox event back to PENDING',
		);
	}
}
