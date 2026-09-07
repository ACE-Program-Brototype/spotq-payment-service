import { prisma } from '@infrastructure/database/prisma.ts';
import { logger } from '@infrastructure/logger/index.ts';

export class PaymentSubscriptionExpiryService {
	private intervalId: NodeJS.Timeout | null = null;
	private isRunning = false;

	start(intervalMs = 60 * 60 * 1000): void {
		if (this.intervalId) return;

		this.expirePastDueSubscriptions().catch((err) => {
			logger.error({ err }, 'Error in initial payment subscription expiry check');
		});

		this.intervalId = setInterval(() => {
			this.expirePastDueSubscriptions().catch((err) => {
				logger.error({ err }, 'Error in scheduled payment subscription expiry check');
			});
		}, intervalMs);

		logger.info({ intervalMs }, 'PaymentSubscriptionExpiryService started');
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			logger.info('PaymentSubscriptionExpiryService stopped');
		}
	}

	async expirePastDueSubscriptions(now = new Date()): Promise<number> {
		if (this.isRunning) return 0;
		this.isRunning = true;

		try {
			const result = await prisma.subscription.updateMany({
				where: {
					status: 'ACTIVE',
					currentPeriodEnd: {
						lt: now,
					},
				},
				data: {
					status: 'EXPIRED',
				},
			});

			if (result.count > 0) {
				logger.info(
					{ count: result.count, timestamp: now.toISOString() },
					'Marked past-due subscriptions as EXPIRED in payment ledger',
				);
			}

			return result.count;
		} catch (error) {
			logger.error({ err: error }, 'Failed to expire past-due payment subscriptions');
			throw error;
		} finally {
			this.isRunning = false;
		}
	}
}

export const paymentSubscriptionExpiryService = new PaymentSubscriptionExpiryService();
