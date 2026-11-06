import type {
	WithdrawFromRestaurantWalletInputDTO,
	WithdrawFromRestaurantWalletOutputDTO,
} from '@application/dtos/restaurant-wallet/withdraw-from-restaurant-wallet.dto.ts';
import type { IWithdrawFromRestaurantWalletUseCase } from '@application/ports/use-cases/restaurant-wallet/withdraw-from-restaurant-wallet.use-case.port.ts';
import { injectable } from 'inversify';

@injectable()
export class WithdrawFromRestaurantWalletUseCase implements IWithdrawFromRestaurantWalletUseCase {
	async execute(
		input: WithdrawFromRestaurantWalletInputDTO,
	): Promise<WithdrawFromRestaurantWalletOutputDTO> {
		throw new Error('Restaurant wallet withdrawal is not implemented');
	}
}
