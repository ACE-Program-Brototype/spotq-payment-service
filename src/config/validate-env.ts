import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'testing', 'production', 'test']),

	PORT: z.coerce.number().positive(),

	SERVICE_NAME: z.string().min(1).default('payment-service'),

	LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),

	DATABASE_URL: z.string().url(),

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

	GOTENBERG_URL: z.string().url().default('http://gotenberg:3008'),

	AWS_ACCESS_KEY_ID: z.string().trim().min(1),
	AWS_SECRET_ACCESS_KEY: z.string().trim().min(1),
	AWS_REGION: z.string().trim().min(1).default('ap-south-1'),
	AWS_S3_BUCKET: z.string().trim().min(1).default('spotq-order-invoices'),
	AWS_S3_ENDPOINT: z.string().url().optional(),
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
