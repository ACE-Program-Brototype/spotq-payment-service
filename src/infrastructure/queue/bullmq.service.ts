import { Redis, type RedisOptions } from 'ioredis';
import { config } from '../../config/index.js';
import { MESSAGES } from '../../shared/constants/index.js';
import { logger } from '../logger/index.js';
import { bullmqConnection } from './bullmq.client.js';

// biome-ignore lint/complexity/noStaticOnlyClass: service structure uses static class methods
export class BullMQService {
	private static client: Redis | null = null;

	static async connect(): Promise<void> {
		if (BullMQService.client) {
			return;
		}

		try {
			// Instantiate dedicated ioredis client using the url and connection options
			BullMQService.client = new Redis(config.redis.url, bullmqConnection as RedisOptions);

			BullMQService.client.on('error', (err) => {
				logger.error({ err }, MESSAGES.BULLMQ_CONNECTION_ERROR);
			});

			// Validate connection
			await BullMQService.client.ping();
			logger.info(MESSAGES.BULLMQ_CONNECTED);
		} catch (error) {
			logger.error({ err: error }, MESSAGES.BULLMQ_CONNECTION_FAILED);
			BullMQService.client = null;
			throw error;
		}
	}

	static async disconnect(): Promise<void> {
		if (BullMQService.client) {
			try {
				await BullMQService.client.quit();
				logger.info(MESSAGES.BULLMQ_DISCONNECTED);
			} catch (error) {
				logger.error({ err: error }, MESSAGES.BULLMQ_DISCONNECT_ERROR);
			} finally {
				BullMQService.client = null;
			}
		}
	}

	static async isHealthy(): Promise<boolean> {
		if (!BullMQService.client) {
			return false;
		}

		try {
			const status = await BullMQService.client.ping();
			return status === 'PONG';
		} catch {
			return false;
		}
	}
}
