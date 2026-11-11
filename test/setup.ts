import crypto from 'node:crypto';
import 'reflect-metadata';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
	modulusLength: 2048,
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

process.env.NODE_ENV = 'test';
process.env.PORT = '3005';
process.env.SERVICE_NAME = 'spotq-payment-service';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL =
	'postgresql://postgres:postgres@localhost:5432/spotq_payment_test?sslmode=disable';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.RAZORPAY_TEST_API_KEY = 'rzp_test_1234567890';
process.env.RAZORPAY_TEST_SECRET_KEY = 'test_secret_key_1234567890';
process.env.RAZORPAY_CB_TIMEOUT_MS = '100';
process.env.RAZORPAY_CB_ERROR_THRESHOLD_PERCENT = '50';
process.env.RAZORPAY_CB_RESET_TIMEOUT_MS = '150';
process.env.RAZORPAY_CB_VOLUME_THRESHOLD = '2';
process.env.QUEUE_PREFIX = 'spotq_payment_test';
process.env.RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
process.env.RABBITMQ_PREFETCH_COUNT = '10';
process.env.ORDER_S2S_PUBLIC_KEY = publicKey;
process.env.S2S_AUDIENCE = 'payment-service';
process.env.S2S_PRIVATE_KEY = privateKey;
process.env.GOTENBERG_URL = 'http://localhost:3008';
process.env.AWS_REGION = 'ap-south-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_S3_BUCKET = 'spotq-order-invoices';
process.env.AWS_S3_PRESIGNED_URL_EXPIRATION_SECONDS = '900';
