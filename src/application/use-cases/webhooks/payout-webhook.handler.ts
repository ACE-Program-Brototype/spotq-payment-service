import type { WebhookPayload } from '@application/dtos/handle-webhook.dto.ts';
import { WALLET_LEDGER_STATUSES } from '@domain/constants/wallet-ledger.constants';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { RAZORPAY_WEBHOOK_EVENTS } from '@shared/constants/index.ts';
import type { IWebhookEventHandler } from './webhook-event-handler.interface.ts';

/**
 * Handles payout webhook lifecycle events (`payout.processed`, `payout.rejected`, `payout.failed`, `payout.reversed`).
 */
export class PayoutWebhookHandler implements IWebhookEventHandler {
	readonly supportedEvents = [
		RAZORPAY_WEBHOOK_EVENTS.PAYOUT_PROCESSED,
		RAZORPAY_WEBHOOK_EVENTS.PAYOUT_REJECTED,
		RAZORPAY_WEBHOOK_EVENTS.PAYOUT_FAILED,
		RAZORPAY_WEBHOOK_EVENTS.PAYOUT_REVERSED,
	] as const;

	constructor(private readonly restaurantWalletRepository: IRestaurantWalletRepository) {}

	async handle(eventType: string, parsedPayload: WebhookPayload): Promise<void> {
		const payoutEntity = parsedPayload.payload?.payout?.entity;
		if (!payoutEntity) {
			return;
		}

		if (eventType === RAZORPAY_WEBHOOK_EVENTS.PAYOUT_PROCESSED) {
			if (!payoutEntity.reference_id) {
				logger.warn(
					{ payoutId: payoutEntity.id },
					'Processed payout webhook did not include a reference ID',
				);
				return;
			}

			await this.restaurantWalletRepository.markWithdrawalProcessed(
				payoutEntity.reference_id,
				payoutEntity.utr,
			);
			logger.info(
				{ payoutId: payoutEntity.id, referenceId: payoutEntity.reference_id },
				'Payout processed webhook updated the withdrawal ledger',
			);
			return;
		}

		if (!payoutEntity.reference_id) {
			logger.warn(
				{ payoutId: payoutEntity.id, eventType },
				'Payout failure webhook did not include a reference ID',
			);
			return;
		}

		const withdrawalStatus =
			eventType === RAZORPAY_WEBHOOK_EVENTS.PAYOUT_REVERSED
				? WALLET_LEDGER_STATUSES.REVERSED
				: WALLET_LEDGER_STATUSES.FAILED;

		await this.restaurantWalletRepository.failWithdrawal(
			payoutEntity.reference_id,
			withdrawalStatus,
		);
		logger.info(
			{ payoutId: payoutEntity.id, referenceId: payoutEntity.reference_id, eventType },
			'Payout failure received from Razorpay webhook; withdrawal reservation released',
		);
	}
}
