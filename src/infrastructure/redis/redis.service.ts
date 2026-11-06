import type { ICacheService } from '@application/ports/services/cache.service.port.ts';
import type { IHealthCheckable } from '@domain/index.ts';
import type { RedisClientType } from 'redis';
import { redisClient } from './redis.client.ts';

export class RedisService implements ICacheService, IHealthCheckable {
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

	async get(key: string): Promise<string | null> {
		try {
			if (!this.client.isOpen) return null;
			return await this.client.get(key);
		} catch {
			return null;
		}
	}

	async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
		try {
			if (!this.client.isOpen) return;
			if (ttlSeconds) {
				await this.client.set(key, value, { EX: ttlSeconds });
			} else {
				await this.client.set(key, value);
			}
		} catch {
			// Ignore cache write failures.
		}
	}

	async acquireLock(key: string, ttlSeconds = 10): Promise<boolean> {
		try {
			if (!this.client.isOpen) return true;
			const result = await this.client.set(key, 'locked', {
				NX: true,
				EX: ttlSeconds,
			});
			return result === 'OK';
		} catch {
			return true;
		}
	}

	async releaseLock(key: string): Promise<void> {
		try {
			if (this.client.isOpen) {
				await this.client.del(key);
			}
		} catch {
			// ignore cleanup errors
		}
	}
}

export const redisService = new RedisService(redisClient);
export const RedisServiceInstance = redisService;
