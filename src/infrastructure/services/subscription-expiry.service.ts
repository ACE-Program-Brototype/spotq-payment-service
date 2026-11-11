import type { IPaymentSubscriptionExpiryService } from '@application/ports/services/subscription-expiry.service.port.ts';
import { TYPES } from '@di/types.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { EXPIRY_CHECK_INTERVAL_MS } from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class PaymentSubscriptionExpiryService implements IPaymentSubscriptionExpiryService {
	private intervalId: NodeJS.Timeout | null = null;
	private isRunning = false;

	constructor(
		@inject(TYPES.Repositories.SubscriptionRepository)
		private readonly subscriptionRepository: ISubscriptionRepository,
	) {}

	start(intervalMs = EXPIRY_CHECK_INTERVAL_MS): void {
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
			const expiredCount =
				await this.subscriptionRepository.expirePastDueSubscriptionsWithOutbox(now);

			if (expiredCount > 0) {
				logger.info(
					{ count: expiredCount, timestamp: now.toISOString() },
					'Marked past-due subscriptions as EXPIRED and created outbox events',
				);
			}

			return expiredCount;
		} catch (error) {
			logger.error({ err: error }, 'Failed to expire past-due payment subscriptions');
			throw error;
		} finally {
			this.isRunning = false;
		}
	}
}
