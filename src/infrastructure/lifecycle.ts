import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { IPaymentSubscriptionExpiryService } from '@application/ports/services/subscription-expiry.service.port.ts';
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { ISubscriptionEventProducer } from '@domain/interfaces/subscription-event-producer.interface.ts';
import { MESSAGES } from '@shared/constants/index.ts';
import { databaseService } from './database/index.ts';
import { logger } from './logger/index.ts';
import { bullmqService } from './queue/index.ts';
import { redisService } from './redis/index.ts';

export async function initInfrastructure(): Promise<void> {
	await databaseService.connect();
	await redisService.connect();

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

	container.get<IOutboxRelayService>(TYPES.Services.OutboxRelayService).start(5000);
	container
		.get<IPaymentSubscriptionExpiryService>(TYPES.Services.SubscriptionExpiryService)
		.start(60 * 60 * 1000);
}

export async function shutdownInfrastructure(): Promise<void> {
	container.get<IOutboxRelayService>(TYPES.Services.OutboxRelayService).stop();
	container.get<IPaymentSubscriptionExpiryService>(TYPES.Services.SubscriptionExpiryService).stop();

	try {
		await container
			.get<ISubscriptionEventProducer>(TYPES.Services.SubscriptionEventProducer)
			.close();
	} catch (error) {
		logger.error({ err: error }, 'Error closing SubscriptionEventProducer during shutdown');
	}

	await Promise.allSettled([
		databaseService.disconnect(),
		redisService.disconnect(),
		bullmqService.disconnect(),
	]);
}
