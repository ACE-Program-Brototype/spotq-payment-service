import type {
	WithdrawFromRestaurantWalletInputDTO,
	WithdrawFromRestaurantWalletOutputDTO,
} from '@application/dtos/restaurant-wallet/withdraw-from-restaurant-wallet.dto.ts';

export interface IWithdrawFromRestaurantWalletUseCase {
	execute(
		input: WithdrawFromRestaurantWalletInputDTO,
	): Promise<WithdrawFromRestaurantWalletOutputDTO>;
}
