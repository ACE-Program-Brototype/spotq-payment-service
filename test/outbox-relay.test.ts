import {
	MAX_OUTBOX_RETRIES,
	OutboxRelayService,
} from '../src/infrastructure/outbox/outbox-relay.service';
import { subscriptionEventProducer } from '../src/infrastructure/queue/subscription-event.producer';
import { outboxRepository } from '../src/infrastructure/repositories/prisma-outbox.repository';

jest.mock('../src/infrastructure/repositories/prisma-outbox.repository');
jest.mock('../src/infrastructure/queue/subscription-event.producer');
jest.mock('../src/infrastructure/logger', () => ({
	logger: {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

describe('OutboxRelayService & Dead-Letter Handling', () => {
	let relayService: OutboxRelayService;

	beforeEach(() => {
		jest.clearAllMocks();
		relayService = new OutboxRelayService(outboxRepository);
	});

	it('successfully publishes pending outbox events and marks them PUBLISHED', async () => {
		const mockEvents = [
			{
				id: 'event-1',
				eventType: 'subscription.activated',
				aggregateId: 'sub-1',
				payload: { restaurantId: 'res-1', planCode: 'QUEUE_PRO' },
				status: 'PENDING' as const,
				retryCount: 0,
				createdAt: new Date(),
			},
		];

		(outboxRepository.findPendingEvents as jest.Mock).mockResolvedValue(mockEvents);
		(subscriptionEventProducer.publishSubscriptionActivated as jest.Mock).mockResolvedValue(
			'job-123',
		);
		(outboxRepository.markPublished as jest.Mock).mockResolvedValue(undefined);

		await relayService.processPendingEvents();

		expect(subscriptionEventProducer.publishSubscriptionActivated).toHaveBeenCalledWith({
			restaurantId: 'res-1',
			planCode: 'QUEUE_PRO',
			eventId: 'event-1',
		});
		expect(outboxRepository.markPublished).toHaveBeenCalledWith('event-1');
	});

	it('records retry and stays PENDING when dispatch fails below MAX_RETRIES', async () => {
		const mockEvents = [
			{
				id: 'event-2',
				eventType: 'subscription.activated',
				aggregateId: 'sub-2',
				payload: { restaurantId: 'res-2' },
				status: 'PENDING' as const,
				retryCount: 1,
				createdAt: new Date(),
			},
		];

		(outboxRepository.findPendingEvents as jest.Mock).mockResolvedValue(mockEvents);
		(subscriptionEventProducer.publishSubscriptionActivated as jest.Mock).mockRejectedValue(
			new Error('Redis connection timeout'),
		);
		(outboxRepository.recordFailure as jest.Mock).mockResolvedValue({
			isDeadLetter: false,
			retryCount: 2,
		});

		await relayService.processPendingEvents();

		expect(outboxRepository.recordFailure).toHaveBeenCalledWith(
			'event-2',
			'Redis connection timeout',
			MAX_OUTBOX_RETRIES,
		);
		expect(outboxRepository.markPublished).not.toHaveBeenCalled();
	});

	it('transitions event to FAILED (Dead-Letter state) when MAX_RETRIES is reached', async () => {
		const mockEvents = [
			{
				id: 'event-3',
				eventType: 'subscription.activated',
				aggregateId: 'sub-3',
				payload: { restaurantId: 'res-3' },
				status: 'PENDING' as const,
				retryCount: 4,
				createdAt: new Date(),
			},
		];

		(outboxRepository.findPendingEvents as jest.Mock).mockResolvedValue(mockEvents);
		(subscriptionEventProducer.publishSubscriptionActivated as jest.Mock).mockRejectedValue(
			new Error('Persistent serialization error'),
		);
		(outboxRepository.recordFailure as jest.Mock).mockResolvedValue({
			isDeadLetter: true,
			retryCount: 5,
		});

		await relayService.processPendingEvents();

		expect(outboxRepository.recordFailure).toHaveBeenCalledWith(
			'event-3',
			'Persistent serialization error',
			MAX_OUTBOX_RETRIES,
		);
	});

	it('replays a dead-letter event back to PENDING', async () => {
		const replayedEvent = {
			id: 'event-3',
			eventType: 'subscription.activated',
			aggregateId: 'sub-3',
			payload: { restaurantId: 'res-3' },
			status: 'PENDING' as const,
			retryCount: 0,
			lastError: null,
			createdAt: new Date(),
		};

		(outboxRepository.replayDeadLetter as jest.Mock).mockResolvedValue(replayedEvent);

		await relayService.replayDeadLetterEvent('event-3');

		expect(outboxRepository.replayDeadLetter).toHaveBeenCalledWith('event-3');
	});
});
