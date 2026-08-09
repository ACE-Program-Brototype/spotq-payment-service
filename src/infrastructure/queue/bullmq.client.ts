import { config } from '@config/index.js';
import type { ConnectionOptions } from 'bullmq';

const isTls = config.redis.url.startsWith('rediss://');

export const bullmqConnection: ConnectionOptions = {
	tls: isTls ? {} : undefined,
	maxRetriesPerRequest: null,
	enableReadyCheck: false,
};
