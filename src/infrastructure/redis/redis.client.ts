import { createClient } from 'redis';
import { config } from '../../config/index.js';
import { MESSAGES } from '../../shared/constants/index.js';

const isTls = config.redis.url.startsWith('rediss://');

export const redisClient = createClient({
	url: config.redis.url,
	socket: {
		tls: isTls ? true : undefined,
		reconnectStrategy(retries) {
			if (retries > 10) {
				return new Error(MESSAGES.REDIS_RECONNECT_FAILED);
			}

			return Math.min(retries * 500, 5000);
		},
	},
});

redisClient.on('connect', () => {
	console.log(MESSAGES.REDIS_CONNECTING);
});

redisClient.on('ready', () => {
	console.log(MESSAGES.REDIS_CONNECTED);
});

redisClient.on('reconnecting', () => {
	console.log(MESSAGES.REDIS_RECONNECTING);
});

redisClient.on('error', (error) => {
	console.error(MESSAGES.REDIS_ERROR, error);
});
