import 'dotenv/config';

import { validateEnv } from './validate-env.ts';

export const env = validateEnv();

export const config = {
	server: {
		port: env.PORT,
		nodeEnv: env.NODE_ENV,
	},

	service: {
		name: env.SERVICE_NAME,
		logLevel: env.LOG_LEVEL,
	},

	database: {
		url: env.DATABASE_URL,
		directUrl: env.DATABASE_URL,
		pool: {
			max: env.DB_POOL_MAX,
			idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
			connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
		},
	},

	redis: {
		url: env.REDIS_URL,
		queuePrefix: env.QUEUE_PREFIX,
	},

	rabbitmq: {
		url: env.RABBITMQ_URL,
		prefetchCount: env.RABBITMQ_PREFETCH_COUNT,
	},

	razorpay: {
		keyId: env.RAZORPAY_TEST_API_KEY,
		keySecret: env.RAZORPAY_TEST_SECRET_KEY,
		webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
	},

	s2s: {
		audience: env.S2S_AUDIENCE,
		orderPublicKey: env.ORDER_S2S_PUBLIC_KEY,
		privateKey: env.S2S_PRIVATE_KEY,
		tokenTtlMs: Number(process.env.S2S_TOKEN_TTL_MS) || 10 * 60 * 1000,
	},

	services: {
		restaurantServiceUrl: env.RESTAURANT_SERVICE_URL,
	},

	storage: {
		region: env.AWS_REGION,
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		bucket: env.AWS_S3_BUCKET,
		presignedUrlExpirationSeconds: env.AWS_S3_PRESIGNED_URL_EXPIRATION_SECONDS,
	},
} as const;
