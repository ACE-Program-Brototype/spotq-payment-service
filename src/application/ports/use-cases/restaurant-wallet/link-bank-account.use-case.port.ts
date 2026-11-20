import type {
	LinkRestaurantWalletBankAccountInputDTO,
	LinkRestaurantWalletBankAccountOutputDTO,
} from '@application/dtos/restaurant-wallet/link-restaurant-wallet-bank-account.dto';

export interface ILinkBankAccountUseCase {
	execute(
		input: LinkRestaurantWalletBankAccountInputDTO,
	): Promise<LinkRestaurantWalletBankAccountOutputDTO>;
}
