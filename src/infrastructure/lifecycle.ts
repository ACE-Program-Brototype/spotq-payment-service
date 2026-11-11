import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { IPaymentSubscriptionExpiryService } from '@application/ports/services/subscription-expiry.service.port.ts';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { config } from '@config/index.ts';
import { orderInvoiceConsumer } from '@di/consumer.resolution.ts';
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { ISubscriptionEventProducer } from '@domain/interfaces/subscription-event-producer.interface.ts';
import {
	EXPIRY_CHECK_INTERVAL_MS,
	MESSAGES,
	OUTBOX_RELAY_INTERVAL_MS,
} from '@shared/constants/index.ts';
import type { DatabaseService } from './database/index.ts';
import { logger } from './logger/index.ts';
import type { BullMQService } from './queue/index.ts';
import type { RabbitMQService } from './rabbitmq/index.ts';
import type { RedisService } from './redis/index.ts';
import { s3Client } from './storage/index.ts';

export async function initInfrastructure(): Promise<void> {
	const databaseService = container.get<DatabaseService>(TYPES.Services.DatabaseService);
	const redisService = container.get<RedisService>(TYPES.Services.RedisService);
	const bullmqService = container.get<BullMQService>(TYPES.Services.BullMQService);

	await databaseService.connect();
	await redisService.connect();

	try {
		const rabbitMQService = container.get<RabbitMQService>(TYPES.Services.RabbitMQService);
		await rabbitMQService.connect();
		await orderInvoiceConsumer.start();
	} catch (error) {
		logger.error({ err: error }, MESSAGES.RABBITMQ_INIT_FAILED);
		throw error;
	}

	try {
		await bullmqService.connect();
	} catch (error) {
		logger.error({ err: error }, MESSAGES.BULLMQ_INIT_FAILED);
		throw error;
	}

	try {
		const paymentGateway = container.get<IPaymentGateway>(TYPES.Gateways.PaymentGateway);
		await paymentGateway.initialize();
	} catch (error) {
		logger.error({ err: error }, MESSAGES.RAZORPAY_INIT_FAILED);
		throw error;
	}

	try {
		await s3Client.send(new HeadBucketCommand({ Bucket: config.s3.bucket }));
		logger.info({ bucket: config.s3.bucket }, MESSAGES.S3_BUCKET_ACCESSIBLE);
	} catch (error) {
		logger.error({ err: error, bucket: config.s3.bucket }, MESSAGES.S3_INIT_FAILED);
		throw error;
	}

	container
		.get<IOutboxRelayService>(TYPES.Services.OutboxRelayService)
		.start(OUTBOX_RELAY_INTERVAL_MS);
	container
		.get<IPaymentSubscriptionExpiryService>(TYPES.Services.SubscriptionExpiryService)
		.start(EXPIRY_CHECK_INTERVAL_MS);
}

export async function shutdownInfrastructure(): Promise<void> {
	container.get<IOutboxRelayService>(TYPES.Services.OutboxRelayService).stop();
	container.get<IPaymentSubscriptionExpiryService>(TYPES.Services.SubscriptionExpiryService).stop();

	try {
		await orderInvoiceConsumer.stop();
	} catch (error) {
		logger.error({ err: error }, 'Error stopping OrderInvoiceConsumer during shutdown');
	}

	try {
		await container
			.get<ISubscriptionEventProducer>(TYPES.Services.SubscriptionEventProducer)
			.close();
	} catch (error) {
		logger.error({ err: error }, 'Error closing SubscriptionEventProducer during shutdown');
	}

	await Promise.allSettled([
		container.get<DatabaseService>(TYPES.Services.DatabaseService).disconnect(),
		container.get<RedisService>(TYPES.Services.RedisService).disconnect(),
		container.get<BullMQService>(TYPES.Services.BullMQService).disconnect(),
		container.get<RabbitMQService>(TYPES.Services.RabbitMQService).disconnect(),
	]);
}
