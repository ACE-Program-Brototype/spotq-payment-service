import { config } from '@config/index.ts';
import type { IHealthCheckable } from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { MESSAGES } from '@shared/constants/index.ts';
import {
	type ConsumeOptions,
	type MessageHandler,
	type PublishOptions,
	RabbitMQClient,
} from '@spotq-org/rabbitmq-client';

export class RabbitMQService implements IHealthCheckable {
	private readonly client: RabbitMQClient;

	constructor() {
		this.client = new RabbitMQClient({
			url: config.rabbitmq.url,
			serviceName: config.service.name,
			logger,
			prefetchCount: config.rabbitmq.prefetchCount,
			dlqOptions: {
				enabled: true,
			},
		});
	}

	async connect(): Promise<void> {
		try {
			await this.client.connect();
			logger.info(MESSAGES.RABBITMQ_CONNECTED);
		} catch (error) {
			logger.error({ err: error }, MESSAGES.RABBITMQ_CONNECTION_ERROR);
			throw error;
		}
	}

	async disconnect(): Promise<void> {
		try {
			await this.client.close();
			logger.info(MESSAGES.RABBITMQ_DISCONNECTED);
		} catch (error) {
			logger.error({ err: error }, MESSAGES.RABBITMQ_CONNECTION_ERROR);
		}
	}

	async isHealthy(): Promise<boolean> {
		return this.client.isConnected();
	}

	isConnected(): boolean {
		return this.client.isConnected();
	}

	getClient(): RabbitMQClient {
		return this.client;
	}

	async publishToQueue<T = unknown>(
		queue: string,
		message: T,
		options?: PublishOptions,
	): Promise<boolean> {
		return this.client.publishToQueue(queue, message, options);
	}

	async consumeFromQueue<T = unknown>(
		queue: string,
		handler: MessageHandler<T>,
		options?: ConsumeOptions,
	): Promise<void> {
		return this.client.consumeFromQueue(queue, handler, options);
	}
}

export const rabbitMQService = new RabbitMQService();
