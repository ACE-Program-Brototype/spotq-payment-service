import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.PORT = '3005';
process.env.SERVICE_NAME = 'spotq-payment-service';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL =
	'postgresql://postgres:postgres@localhost:5432/spotq_payment_test?sslmode=disable';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.RAZORPAY_TEST_API_KEY = 'rzp_test_1234567890';
process.env.RAZORPAY_TEST_SECRET_KEY = 'test_secret_key_1234567890';
process.env.QUEUE_PREFIX = 'spotq_payment_test';
