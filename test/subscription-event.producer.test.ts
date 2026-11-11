import type { RabbitMQService } from '../src/infrastructure/rabbitmq/rabbitmq.client';
import {
	RABBITMQ_QUEUES,
	SUBSCRIPTION_ACTIVATED_EVENT,
	SUBSCRIPTION_EVENTS_QUEUE,
	SUBSCRIPTION_EXPIRED_EVENT,
	SubscriptionEventProducer,
} from '../src/infrastructure/rabbitmq/subscription-event.producer';
import { MESSAGES } from '../src/shared/constants/message.constants';

jest.mock('../src/infrastructure/logger', () => ({
	logger: {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
	},
}));

describe('SubscriptionEventProducer (RabbitMQ)', () => {
	let producer: SubscriptionEventProducer;
	let mockRabbitMQService: jest.Mocked<RabbitMQService>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRabbitMQService = {
			publishToQueue: jest.fn().mockResolvedValue(true),
			consumeFromQueue: jest.fn(),
			connect: jest.fn(),
			disconnect: jest.fn(),
			isHealthy: jest.fn(),
		} as unknown as jest.Mocked<RabbitMQService>;

		producer = new SubscriptionEventProducer(mockRabbitMQService);
	});

	it('should have consistent queue and event constants', () => {
		expect(SUBSCRIPTION_EVENTS_QUEUE).toBe(RABBITMQ_QUEUES.SUBSCRIPTION_EVENTS);
		expect(SUBSCRIPTION_EVENTS_QUEUE).toBe('restaurant-subscription-events');
		expect(SUBSCRIPTION_ACTIVATED_EVENT).toBe('subscription.activated');
		expect(SUBSCRIPTION_EXPIRED_EVENT).toBe('subscription.expired');
	});

	describe('publishSubscriptionActivated', () => {
		const payload = {
			eventId: 'evt-123',
			subscriptionId: 'sub-456',
			restaurantId: 'rest-789',
			planCode: 'PRO_MONTHLY',
			status: 'ACTIVE',
			currentPeriodStart: '2026-11-10T00:00:00.000Z',
			currentPeriodEnd: '2026-12-10T00:00:00.000Z',
			timestamp: '2026-11-10T12:00:00.000Z',
		};

		it('should publish subscription.activated message to RabbitMQ successfully', async () => {
			await producer.publishSubscriptionActivated(payload);

			expect(mockRabbitMQService.publishToQueue).toHaveBeenCalledTimes(1);
			expect(mockRabbitMQService.publishToQueue).toHaveBeenCalledWith(
				RABBITMQ_QUEUES.SUBSCRIPTION_EVENTS,
				{
					...payload,
					eventType: 'subscription.activated',
					aggregateId: 'rest-789',
				},
				{ persistent: true },
			);
		});

		it('should throw an error with constant message when RabbitMQ publish returns false', async () => {
			mockRabbitMQService.publishToQueue.mockResolvedValueOnce(false);

			await expect(producer.publishSubscriptionActivated(payload)).rejects.toThrow(
				MESSAGES.RABBITMQ_PUBLISH_FAILED,
			);
		});

		it('should rethrow error when RabbitMQService throws', async () => {
			mockRabbitMQService.publishToQueue.mockRejectedValueOnce(new Error('AMQP connection lost'));

			await expect(producer.publishSubscriptionActivated(payload)).rejects.toThrow(
				'AMQP connection lost',
			);
		});
	});

	describe('publishSubscriptionExpired', () => {
		const payload = {
			eventId: 'evt-999',
			subscriptionId: 'sub-456',
			restaurantId: 'rest-789',
			planCode: 'PRO_MONTHLY',
			status: 'EXPIRED',
			currentPeriodStart: '2026-10-10T00:00:00.000Z',
			currentPeriodEnd: '2026-11-10T00:00:00.000Z',
			timestamp: '2026-11-10T12:00:00.000Z',
		};

		it('should publish subscription.expired message to RabbitMQ successfully', async () => {
			await producer.publishSubscriptionExpired(payload);

			expect(mockRabbitMQService.publishToQueue).toHaveBeenCalledTimes(1);
			expect(mockRabbitMQService.publishToQueue).toHaveBeenCalledWith(
				RABBITMQ_QUEUES.SUBSCRIPTION_EVENTS,
				{
					...payload,
					eventType: 'subscription.expired',
					aggregateId: 'rest-789',
				},
				{ persistent: true },
			);
		});

		it('should throw an error with constant message when RabbitMQ publish returns false', async () => {
			mockRabbitMQService.publishToQueue.mockResolvedValueOnce(false);

			await expect(producer.publishSubscriptionExpired(payload)).rejects.toThrow(
				MESSAGES.RABBITMQ_PUBLISH_FAILED,
			);
		});

		it('should rethrow error when RabbitMQService throws', async () => {
			mockRabbitMQService.publishToQueue.mockRejectedValueOnce(new Error('Broker unreachable'));

			await expect(producer.publishSubscriptionExpired(payload)).rejects.toThrow(
				'Broker unreachable',
			);
		});
	});
});
