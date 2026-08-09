import { config } from '@config/index.js';
import { PrismaService } from '@infrastructure/database/index.js';
import { logger } from '@infrastructure/logger/index.js';
import { RazorpayService } from '@infrastructure/payment/index.js';
import { BullMQService } from '@infrastructure/queue/index.js';
import { RedisService } from '@infrastructure/redis/index.js';
import { MESSAGES } from '@shared/constants/index.js';
import app from './app.js';

async function bootstrap() {
	await PrismaService.connect();
	await RedisService.connect();

	try {
		await BullMQService.connect();
	} catch (error) {
		logger.error({ err: error }, MESSAGES.BULLMQ_INIT_FAILED);
		process.exit(1);
	}

	try {
		await RazorpayService.initialize();
	} catch (error) {
		logger.error({ err: error }, MESSAGES.RAZORPAY_INIT_FAILED);
		process.exit(1);
	}

	const server = app.listen(config.server.port, () => {
		logger.info(`${config.service.name} running on port ${config.server.port}`);
	});

	const shutdown = async () => {
		logger.info(MESSAGES.SHUTDOWN_STARTING);

		await PrismaService.disconnect();
		await RedisService.disconnect();
		await BullMQService.disconnect();

		server.close(() => {
			logger.info(MESSAGES.SHUTDOWN_COMPLETED);
			process.exit(0);
		});
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
	logger.error(error, MESSAGES.SERVER_BOOTSTRAP_FAILED);
	process.exit(1);
});
