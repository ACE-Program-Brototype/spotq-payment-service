import type { ConnectionOptions } from 'bullmq';
import { config } from '../../config/index.js';

const isTls = config.redis.url.startsWith('rediss://');

export const bullmqConnection: ConnectionOptions = {
	tls: isTls ? {} : undefined,
	maxRetriesPerRequest: null,
	enableReadyCheck: false,
};
