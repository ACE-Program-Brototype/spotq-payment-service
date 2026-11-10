import type { LinkRestaurantWalletBankAccountOutputDTO } from '@application/dtos/restaurant-wallet/link-restaurant-wallet-bank-account.dto';
import type { RestaurantWallet } from '@domain/entities/restaurant-wallet.entity';

export const LinkBankAccountMapper = {
	toDto(
		bankName: string,
		wallet: Pick<RestaurantWallet, 'bankAccountLast4' | 'updatedAt'>,
	): LinkRestaurantWalletBankAccountOutputDTO {
		return {
			isLinked: true,
			bankName,
			accountNumberMasked: `•••• •••• ${wallet.bankAccountLast4}`,
			linkedAt: wallet.updatedAt.toISOString(),
		};
	},
};
