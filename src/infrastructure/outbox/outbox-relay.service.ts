import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import { TYPES } from '@di/types.ts';
import type { IOutboxRepository } from '@domain/repositories/outbox.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	type SubscriptionActivatedEventPayload,
	subscriptionEventProducer,
} from '@infrastructure/queue/subscription-event.producer.ts';
import { inject, injectable } from 'inversify';

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

	constructor(
		@inject(TYPES.Repositories.OutboxRepository)
		private readonly outboxRepository: IOutboxRepository,
	) {}

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
		this.isProcessing = true;

		try {
			const pendingEvents = await this.outboxRepository.findPendingEvents(20);

			for (const event of pendingEvents) {
				try {
					if (event.eventType === 'subscription.activated') {
						const payload = event.payload as unknown as SubscriptionActivatedEventPayload;
						await subscriptionEventProducer.publishSubscriptionActivated({
							...payload,
							eventId: event.id,
						});
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

export const outboxRelayService = new OutboxRelayService(
	// Legacy fallback instance
	{} as unknown as IOutboxRepository,
);
