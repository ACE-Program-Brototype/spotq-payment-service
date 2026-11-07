import { randomUUID } from 'node:crypto';
import type {
	WithdrawFromRestaurantWalletInputDTO,
	WithdrawFromRestaurantWalletOutputDTO,
} from '@application/dtos/restaurant-wallet/withdraw-from-restaurant-wallet.dto.ts';
import type { IWithdrawFromRestaurantWalletUseCase } from '@application/ports/use-cases/restaurant-wallet/withdraw-from-restaurant-wallet.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { WALLET_LEDGER_STATUSES } from '@domain/constants/wallet-ledger.constants';
import {
	PaymentGatewayError,
	PaymentGatewayRequestNotSentError,
} from '@domain/errors/payment.errors.ts';
import { RestaurantWalletNotFoundError } from '@domain/errors/restaurant.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import { DEFAULT_CURRENCY } from '@shared/constants/payment.constants.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class WithdrawFromRestaurantWalletUseCase implements IWithdrawFromRestaurantWalletUseCase {
	constructor(
		@inject(TYPES.Repositories.RestaurantWalletRepository)
		private readonly walletRepository: IRestaurantWalletRepository,
		@inject(TYPES.Gateways.PaymentGateway)
		private readonly paymentGateway: IPaymentGateway,
	) {}

	async execute(
		input: WithdrawFromRestaurantWalletInputDTO,
	): Promise<WithdrawFromRestaurantWalletOutputDTO> {
		const amountPaise = BigInt(input.amountPaise);

		const now = new Date();
		const { todayStart, tomorrowStart } = this.getIndiaBusinessDayBounds(now);

		const wallet = await this.walletRepository.findByRestaurantId(input.restaurantId);

		if (!wallet) throw new RestaurantWalletNotFoundError();
		const todayNetEarnings = await this.walletRepository.getTodayNetEarningsPaise(
			input.restaurantId,
			todayStart,
			tomorrowStart,
		);
		wallet.assertCanWithdraw(amountPaise, todayNetEarnings);

		const reference = randomUUID();
		const reservation = await this.walletRepository.reserveWithdrawal(
			input.restaurantId,
			amountPaise,
			reference,
		);

		let payoutId = reservation.withdrawalReference;

		try {
			const payout = await this.paymentGateway.createPayout({
				fundAccountId: reservation.fundAccountId,
				amountPaise: input.amountPaise,
				currency: DEFAULT_CURRENCY,
				mode: input.mode,
				referenceId: reservation.withdrawalReference,
			});
			console.log(payout);
			payoutId = payout.payoutId;
		} catch (error) {
			if (
				error instanceof PaymentGatewayRequestNotSentError ||
				error instanceof PaymentGatewayError
			) {
				await this.walletRepository.failWithdrawal(reservation.withdrawalReference);
				throw error;
			}
			// Keep other failures reserved until Razorpay's webhook confirms the payout outcome.
		}

		return {
			payoutId,
			withdrawnPaise: Number(reservation.withdrawnPaise),
			remainingBalancePaise: Number(reservation.remainingBalancePaise),
			destination: {
				bankName: reservation.bankName,
				accountNumberMasked: `•••• •••• ${reservation.bankAccountLast4}`,
				mode: input.mode,
			},
			status: WALLET_LEDGER_STATUSES.PROCESSING,
			createdAt: reservation.createdAt.toISOString(),
		};
	}

	getIndiaBusinessDayBounds(now: Date): { todayStart: Date; tomorrowStart: Date } {
		const istOffsetMs = 330 * 60 * 1000;
		const indiaDate = new Date(now.getTime() + istOffsetMs);
		const indiaMidnightUtc = Date.UTC(
			indiaDate.getUTCFullYear(),
			indiaDate.getUTCMonth(),
			indiaDate.getUTCDate(),
		);
		return {
			todayStart: new Date(indiaMidnightUtc - istOffsetMs),
			tomorrowStart: new Date(indiaMidnightUtc + 24 * 60 * 60 * 1000 - istOffsetMs),
		};
	}
}
