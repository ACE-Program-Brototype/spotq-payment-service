import { config } from '@config/index.ts';
import type { IHealthCheckable } from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { MESSAGES } from '@shared/constants/index.ts';
import {
	type ConsumeOptions,
	type ILogger,
	type MessageHandler,
	type PublishOptions,
	RabbitMQClient,
} from '@spotq-org/rabbitmq-client';

const rmqLogger: ILogger = {
	info: (message: string, ...args: unknown[]) => {
		if (args.length > 0) {
			logger.info({ extra: args }, message);
		} else {
			logger.info(message);
		}
	},
	error: (message: string, ...args: unknown[]) => {
		const err = args.find((a) => a instanceof Error);
		if (err) {
			const cause =
				'errors' in err && Array.isArray((err as unknown as { errors: unknown[] }).errors)
					? (err as unknown as { errors: unknown[] }).errors
					: err.cause;
			logger.error({ err, cause, extra: args.filter((a) => a !== err) }, message);
		} else if (args.length > 0) {
			logger.error({ extra: args }, message);
		} else {
			logger.error(message);
		}
	},
	warn: (message: string, ...args: unknown[]) => {
		if (args.length > 0) {
			logger.warn({ extra: args }, message);
		} else {
			logger.warn(message);
		}
	},
	debug: (message: string, ...args: unknown[]) => {
		if (args.length > 0) {
			logger.debug({ extra: args }, message);
		} else {
			logger.debug(message);
		}
	},
};

export class RabbitMQService implements IHealthCheckable {
	private readonly client: RabbitMQClient;

	constructor() {
		this.client = new RabbitMQClient({
			url: config.rabbitmq.url,
			serviceName: config.service.name,
			logger: rmqLogger,
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
