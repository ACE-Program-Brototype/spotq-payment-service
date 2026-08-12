import type { IHealthCheckable } from '@domain/index.ts';
import type { RedisClientType } from 'redis';
import { redisClient } from './redis.client.ts';

export class RedisService implements IHealthCheckable {
	private readonly client: RedisClientType;

	constructor(client: RedisClientType = redisClient) {
		this.client = client;
	}

	async connect(): Promise<void> {
		if (!this.client.isOpen) {
			await this.client.connect();
		}
		await this.client.ping();
	}

	async disconnect(): Promise<void> {
		if (this.client.isOpen) {
			await this.client.quit();
		}
	}

	async isHealthy(): Promise<boolean> {
		try {
			await this.client.ping();
			return true;
		} catch {
			return false;
		}
	}

	async health(): Promise<boolean> {
		return this.isHealthy();
	}
}

export const redisService = new RedisService(redisClient);
export const RedisServiceInstance = redisService;
