import { DB_POOL_DEFAULTS } from '@infrastructure/database/database.constants.ts';
import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'testing', 'production', 'test']),

	PORT: z.coerce.number().positive(),

	SERVICE_NAME: z.string().min(1).default('payment-service'),

	LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),

	DATABASE_URL: z.string().url(),
	DB_POOL_MAX: z.coerce.number().positive().default(DB_POOL_DEFAULTS.MAX_CONNECTIONS),
	DB_IDLE_TIMEOUT_MS: z.coerce.number().positive().default(DB_POOL_DEFAULTS.IDLE_TIMEOUT_MS),
	DB_CONNECTION_TIMEOUT_MS: z.coerce
		.number()
		.positive()
		.default(DB_POOL_DEFAULTS.CONNECTION_TIMEOUT_MS),

	REDIS_URL: z.string().url(),

	RAZORPAY_TEST_API_KEY: z.string().min(1),
	RAZORPAY_TEST_SECRET_KEY: z.string().min(1),
	RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

	QUEUE_PREFIX: z.string().min(1).default('bull'),

	RABBITMQ_URL: z.url().default('amqp://guest:guest@localhost:5672'),
	RABBITMQ_PREFETCH_COUNT: z.coerce.number().positive().default(10),

	ORDER_S2S_PUBLIC_KEY: z.string().min(1),
	S2S_AUDIENCE: z.string().min(1).default('payment-service'),
	S2S_PRIVATE_KEY: z.string().min(1),

	RESTAURANT_SERVICE_URL: z.string().url().default('http://restaurant-service:3001'),

	AWS_REGION: z.string().trim().default('ap-south-1'),
	AWS_ACCESS_KEY_ID: z.string().trim().default('test-access-key'),
	AWS_SECRET_ACCESS_KEY: z.string().trim().default('test-secret-key'),
	AWS_S3_BUCKET: z.string().trim().default('spotq-invoices'),
	AWS_S3_PRESIGNED_URL_EXPIRATION_SECONDS: z.coerce.number().int().positive().default(900),
});

export const validateEnv = () => {
	const result = envSchema.safeParse(process.env);

	if (!result.success) {
		console.error('Invalid environment configuration\n');

		for (const issue of result.error.issues) {
			console.error(`${issue.path.join('.')}: ${issue.message}`);
		}

		process.exit(1);
	}

	return result.data;
};

export type Env = z.infer<typeof envSchema>;
