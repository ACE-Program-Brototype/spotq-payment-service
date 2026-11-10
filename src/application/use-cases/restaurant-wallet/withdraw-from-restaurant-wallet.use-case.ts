import { randomUUID } from 'node:crypto';
import type {
	WithdrawFromRestaurantWalletInputDTO,
	WithdrawFromRestaurantWalletOutputDTO,
} from '@application/dtos/restaurant-wallet/withdraw-from-restaurant-wallet.dto.ts';
import { WithdrawFromRestaurantWalletMapper } from '@application/mappers';
import type { IWithdrawFromRestaurantWalletUseCase } from '@application/ports/use-cases/restaurant-wallet/withdraw-from-restaurant-wallet.use-case.port.ts';
import { TYPES } from '@di/types.ts';
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
			wallet.id,
			amountPaise,
			reference,
		);

		let payoutId: string;
		try {
			const payout = await this.paymentGateway.createPayout({
				fundAccountId: reservation.fundAccountId,
				amountPaise: input.amountPaise,
				currency: DEFAULT_CURRENCY,
				mode: input.mode,
				referenceId: reservation.withdrawalReference,
			});
			payoutId = payout.payoutId;
		} catch (error) {
			await this.walletRepository.failWithdrawal(reservation.withdrawalReference);
			throw error;
		}

		return WithdrawFromRestaurantWalletMapper.toDto(payoutId, reservation, input.mode);
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
