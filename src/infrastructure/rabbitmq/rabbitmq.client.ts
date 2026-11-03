import { config } from '@config/index.ts';
import type { IHealthCheckable } from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	type ConsumeOptions,
	type MessageHandler,
	type PublishOptions,
	RabbitMQClient,
} from '@spotq-org/rabbitmq-client';
import { injectable } from 'inversify';

@injectable()
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
		return this.client.connect();
	}

	async disconnect(): Promise<void> {
		return this.client.close();
	}

	async isHealthy(): Promise<boolean> {
		return this.client.isConnected();
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
