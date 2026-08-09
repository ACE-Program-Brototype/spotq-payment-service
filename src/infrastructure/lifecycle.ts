import { MESSAGES } from '@shared/constants/index.ts';
import { PrismaService } from './database/index.ts';
import { logger } from './logger/index.ts';
import { RazorpayService } from './payment/index.ts';
import { BullMQService } from './queue/index.ts';
import { RedisService } from './redis/index.ts';

export async function initInfrastructure(): Promise<void> {
	await PrismaService.connect();
	await RedisService.connect();

	try {
		await BullMQService.connect();
	} catch (error) {
		logger.error({ err: error }, MESSAGES.BULLMQ_INIT_FAILED);
		throw error;
	}

	try {
		await RazorpayService.initialize();
	} catch (error) {
		logger.error({ err: error }, MESSAGES.RAZORPAY_INIT_FAILED);
		throw error;
	}
}

export async function shutdownInfrastructure(): Promise<void> {
	await Promise.allSettled([
		PrismaService.disconnect(),
		RedisService.disconnect(),
		BullMQService.disconnect(),
	]);
}
