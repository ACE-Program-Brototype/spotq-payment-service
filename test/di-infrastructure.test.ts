import type { ICacheService } from '@application/ports/services/cache.service.port.ts';
import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import { cacheService, container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import * as databaseModule from '@infrastructure/database/index.ts';
import { DatabaseService } from '@infrastructure/database/index.ts';
import * as queueModule from '@infrastructure/queue/index.ts';
import { BullMQService } from '@infrastructure/queue/index.ts';
import * as redisModule from '@infrastructure/redis/index.ts';
import { RedisService } from '@infrastructure/redis/index.ts';

describe('Infrastructure DI Singletons & Clean Exports', () => {
	it('resolves DatabaseService, RedisService, and BullMQService as singletons from container', () => {
		const db1 = container.get<DatabaseService>(TYPES.Services.DatabaseService);
		const db2 = container.get<DatabaseService>(TYPES.Services.DatabaseService);
		expect(db1).toBeInstanceOf(DatabaseService);
		expect(db1).toBe(db2);

		const redis1 = container.get<RedisService>(TYPES.Services.RedisService);
		const redis2 = container.get<RedisService>(TYPES.Services.RedisService);
		const resolvedCache = container.get<ICacheService>(TYPES.Services.CacheService);
		expect(redis1).toBeInstanceOf(RedisService);
		expect(redis1).toBe(redis2);
		expect(resolvedCache).toBe(redis1);
		expect(cacheService).toBe(redis1);

		const bullmq1 = container.get<BullMQService>(TYPES.Services.BullMQService);
		const bullmq2 = container.get<BullMQService>(TYPES.Services.BullMQService);
		expect(bullmq1).toBeInstanceOf(BullMQService);
		expect(bullmq1).toBe(bullmq2);
	});

	it('resolves OutboxRelayService from container with DI-managed RedisService', () => {
		const outboxRelay = container.get<IOutboxRelayService>(TYPES.Services.OutboxRelayService);
		expect(outboxRelay).toBeDefined();
	});

	it('does not expose manual singleton instances or colliding PrismaService exports', () => {
		expect('databaseService' in databaseModule).toBe(false);
		expect('PrismaService' in databaseModule).toBe(false);
		expect('redisService' in redisModule).toBe(false);
		expect('RedisServiceInstance' in redisModule).toBe(false);
		expect('bullmqService' in queueModule).toBe(false);
		expect('PrismaService' in queueModule).toBe(false);
		expect('BullMQServiceInstance' in queueModule).toBe(false);
	});
});
