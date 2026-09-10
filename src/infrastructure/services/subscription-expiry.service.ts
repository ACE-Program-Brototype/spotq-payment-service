import type { IPaymentSubscriptionExpiryService } from '@application/ports/services/subscription-expiry.service.port.ts';
import { prisma } from '@infrastructure/database/prisma.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { injectable } from 'inversify';

@injectable()
export class PaymentSubscriptionExpiryService implements IPaymentSubscriptionExpiryService {
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
			const pastDueSubscriptions = await prisma.subscription.findMany({
				where: {
					status: 'ACTIVE',
					currentPeriodEnd: {
						lt: now,
					},
				},
				include: {
					plan: true,
				},
			});

			if (pastDueSubscriptions.length === 0) {
				return 0;
			}

			const subIds = pastDueSubscriptions.map((s) => s.id);

			await prisma.$transaction(async (tx) => {
				await tx.subscription.updateMany({
					where: {
						id: { in: subIds },
					},
					data: {
						status: 'EXPIRED',
					},
				});

				for (const sub of pastDueSubscriptions) {
					await tx.outboxEvent.create({
						data: {
							eventType: 'subscription.expired',
							aggregateId: sub.restaurantId,
							payload: {
								subscriptionId: sub.id,
								restaurantId: sub.restaurantId,
								planCode: sub.plan.code,
								status: 'EXPIRED',
								expiredAt: now.toISOString(),
								currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
								timestamp: now.toISOString(),
							},
							status: 'PENDING',
						},
					});
				}
			});

			logger.info(
				{ count: pastDueSubscriptions.length, timestamp: now.toISOString() },
				'Marked past-due subscriptions as EXPIRED and created outbox events',
			);

			return pastDueSubscriptions.length;
		} catch (error) {
			logger.error({ err: error }, 'Failed to expire past-due payment subscriptions');
			throw error;
		} finally {
			this.isRunning = false;
		}
	}
}
