import type {
	LinkRestaurantWalletBankAccountInputDTO,
	LinkRestaurantWalletBankAccountOutputDTO,
} from '@application/dtos/restaurant-wallet/link-restaurant-wallet-bank-account.dto';
import type { ILinkBankAccountUseCase } from '@application/ports/use-cases/restaurant-wallet/link-bank-account.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { RestaurantWalletNotFoundError } from '@domain/errors/restaurant.errors.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import { inject, injectable } from 'inversify';

const BANK_NAMES_BY_IFSC_PREFIX: Record<string, string> = {
	AUBL: 'AU Small Finance Bank',
	BARB: 'Bank of Baroda',
	CNRB: 'Canara Bank',
	HDFC: 'HDFC Bank',
	ICIC: 'ICICI Bank',
	IDFB: 'IDFC First Bank',
	INDB: 'IndusInd Bank',
	KKBK: 'Kotak Mahindra Bank',
	PUNB: 'Punjab National Bank',
	SBIN: 'State Bank of India',
	UBIN: 'Union Bank of India',
	UTIB: 'Axis Bank',
	YESB: 'Yes Bank',
};

@injectable()
export class LinkBankAccountUseCase implements ILinkBankAccountUseCase {
	constructor(
		@inject(TYPES.Repositories.RestaurantWalletRepository)
		private readonly walletRepository: IRestaurantWalletRepository,
	) {}

	async execute(
		input: LinkRestaurantWalletBankAccountInputDTO,
	): Promise<LinkRestaurantWalletBankAccountOutputDTO> {
		const ifsc = input.ifsc.toUpperCase();
		const bankName = BANK_NAMES_BY_IFSC_PREFIX[ifsc.slice(0, 4)] ?? ifsc.slice(0, 4);
		const wallet = await this.walletRepository.findByRestaurantId(input.restaurantId);
		if (!wallet) {
			throw new RestaurantWalletNotFoundError();
		}

		wallet.linkBankAccount(bankName, input.accountNumber, ifsc);
		await this.walletRepository.update(wallet.id, wallet);

		return {
			isLinked: true,
			bankName,
			accountNumberMasked: `•••• •••• ${wallet.bankAccountLast4}`,
			linkedAt: wallet.updatedAt.toISOString(),
		};
	}
}
