import type { ISubscriptionEventProducer } from '../src/domain/interfaces/subscription-event-producer.interface';
import type { IOutboxRepository } from '../src/domain/repositories/outbox.repository.interface';
import {
	MAX_OUTBOX_RETRIES,
	OutboxRelayService,
} from '../src/infrastructure/outbox/outbox-relay.service';

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
	let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
	let mockEventProducer: jest.Mocked<ISubscriptionEventProducer>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockOutboxRepository = {
			createEvent: jest.fn(),
			findPendingEvents: jest.fn(),
			markPublished: jest.fn(),
			recordFailure: jest.fn(),
			replayDeadLetter: jest.fn(),
		} as unknown as jest.Mocked<IOutboxRepository>;

		mockEventProducer = {
			publishSubscriptionActivated: jest.fn(),
			close: jest.fn(),
		};

		relayService = new OutboxRelayService(mockOutboxRepository, mockEventProducer);
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

		mockOutboxRepository.findPendingEvents.mockResolvedValue(mockEvents);
		mockEventProducer.publishSubscriptionActivated.mockResolvedValue(undefined);
		mockOutboxRepository.markPublished.mockResolvedValue(undefined);

		await relayService.processPendingEvents();

		expect(mockEventProducer.publishSubscriptionActivated).toHaveBeenCalledWith({
			restaurantId: 'res-1',
			planCode: 'QUEUE_PRO',
			eventId: 'event-1',
		});
		expect(mockOutboxRepository.markPublished).toHaveBeenCalledWith('event-1');
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

		mockOutboxRepository.findPendingEvents.mockResolvedValue(mockEvents);
		mockEventProducer.publishSubscriptionActivated.mockRejectedValue(
			new Error('Redis connection timeout'),
		);
		mockOutboxRepository.recordFailure.mockResolvedValue({
			isDeadLetter: false,
			retryCount: 2,
		});

		await relayService.processPendingEvents();

		expect(mockOutboxRepository.recordFailure).toHaveBeenCalledWith(
			'event-2',
			'Redis connection timeout',
			MAX_OUTBOX_RETRIES,
		);
		expect(mockOutboxRepository.markPublished).not.toHaveBeenCalled();
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

		mockOutboxRepository.findPendingEvents.mockResolvedValue(mockEvents);
		mockEventProducer.publishSubscriptionActivated.mockRejectedValue(
			new Error('Persistent serialization error'),
		);
		mockOutboxRepository.recordFailure.mockResolvedValue({
			isDeadLetter: true,
			retryCount: 5,
		});

		await relayService.processPendingEvents();

		expect(mockOutboxRepository.recordFailure).toHaveBeenCalledWith(
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

		mockOutboxRepository.replayDeadLetter.mockResolvedValue(replayedEvent);

		await relayService.replayDeadLetterEvent('event-3');

		expect(mockOutboxRepository.replayDeadLetter).toHaveBeenCalledWith('event-3');
	});
});
