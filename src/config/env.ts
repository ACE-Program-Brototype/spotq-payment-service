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
	},

	gotenberg: {
		url: env.GOTENBERG_URL,
	},

	s3: {
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		region: env.AWS_REGION,
		bucket: env.AWS_S3_BUCKET,
	},
} as const;
