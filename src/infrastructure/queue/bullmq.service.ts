import { config } from '@config/index.ts';
import type { IHealthCheckable } from '@domain/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { MESSAGES } from '@shared/constants/index.ts';
import { injectable, unmanaged } from 'inversify';
import { Redis, type RedisOptions } from 'ioredis';
import { bullmqConnection } from './bullmq.client.ts';

@injectable()
export class BullMQService implements IHealthCheckable {
	private readonly connectionUrl: string;
	private readonly options: RedisOptions;
	private client: Redis | null = null;

	constructor(
		@unmanaged() connectionUrl: string = config.redis.url,
		@unmanaged() options: RedisOptions = bullmqConnection as RedisOptions,
	) {
		this.connectionUrl = connectionUrl;
		this.options = options;
	}

	async connect(): Promise<void> {
		if (this.client) {
			return;
		}

		try {
			this.client = new Redis(this.connectionUrl, this.options);

			this.client.on('error', (err) => {
				logger.error({ err }, MESSAGES.BULLMQ_CONNECTION_ERROR);
			});

			await this.client.ping();
			logger.info(MESSAGES.BULLMQ_CONNECTED);
		} catch (error) {
			logger.error({ err: error }, MESSAGES.BULLMQ_CONNECTION_FAILED);
			this.client = null;
			throw error;
		}
	}

	async disconnect(): Promise<void> {
		if (this.client) {
			try {
				await this.client.quit();
				logger.info(MESSAGES.BULLMQ_DISCONNECTED);
			} catch (error) {
				logger.error({ err: error }, MESSAGES.BULLMQ_DISCONNECT_ERROR);
			} finally {
				this.client = null;
			}
		}
	}

	async isHealthy(): Promise<boolean> {
		if (!this.client) {
			return false;
		}

		try {
			const status = await this.client.ping();
			return status === 'PONG';
		} catch {
			return false;
		}
	}
}
