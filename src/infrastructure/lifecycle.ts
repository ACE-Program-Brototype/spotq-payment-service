import { MESSAGES } from '@shared/constants/index.ts';
import { databaseService } from './database/index.ts';
import { logger } from './logger/index.ts';
import { outboxRelayService } from './outbox/outbox-relay.service.ts';
import { razorpayService } from './payment/index.ts';
import { bullmqService } from './queue/index.ts';
import { redisService } from './redis/index.ts';
import { paymentSubscriptionExpiryService } from './services/subscription-expiry.service.ts';

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
		await razorpayService.initialize();
	} catch (error) {
		logger.error({ err: error }, MESSAGES.RAZORPAY_INIT_FAILED);
		throw error;
	}

	// Start Outbox Relay Worker & Subscription Expiry Cron
	outboxRelayService.start(5000);
	paymentSubscriptionExpiryService.start(60 * 60 * 1000);
}

export async function shutdownInfrastructure(): Promise<void> {
	outboxRelayService.stop();
	paymentSubscriptionExpiryService.stop();

	await Promise.allSettled([
		databaseService.disconnect(),
		redisService.disconnect(),
		bullmqService.disconnect(),
	]);
}
