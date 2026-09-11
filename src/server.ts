import 'reflect-metadata';
import { config } from '@config/index.ts';
import { initInfrastructure, logger, shutdownInfrastructure } from '@infrastructure/index.ts';
import { MESSAGES } from '@shared/constants/index.ts';
import app from './app.ts';

async function bootstrap() {
	await initInfrastructure();

	const server = app.listen(config.server.port, () => {
		logger.info(`${config.service.name} running on port ${config.server.port}`);
	});

	let isShuttingDown = false;
	const shutdown = async (signal: string) => {
		if (isShuttingDown) {
			logger.warn(MESSAGES.SHUTDOWN_IN_PROGRESS);
			return;
		}
		isShuttingDown = true;
		logger.info({ signal }, MESSAGES.SHUTDOWN_STARTING);

		server.close(async () => {
			await shutdownInfrastructure();
			logger.info(MESSAGES.SHUTDOWN_COMPLETED);
			process.exit(0);
		});
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
	logger.error({ err: error }, MESSAGES.SERVER_BOOTSTRAP_FAILED);
	process.exit(1);
});
