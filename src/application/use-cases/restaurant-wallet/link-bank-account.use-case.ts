import type {
	LinkRestaurantWalletBankAccountInputDTO,
	LinkRestaurantWalletBankAccountOutputDTO,
} from '@application/dtos/restaurant-wallet/link-restaurant-wallet-bank-account.dto';
import { LinkBankAccountMapper } from '@application/mappers';
import type { ILogger } from '@application/ports/services/logger.service.port';
import type { ILinkBankAccountUseCase } from '@application/ports/use-cases/restaurant-wallet/link-bank-account.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { RestaurantWalletNotFoundError } from '@domain/errors/restaurant.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class LinkBankAccountUseCase implements ILinkBankAccountUseCase {
	constructor(
		@inject(TYPES.Repositories.RestaurantWalletRepository)
		private readonly walletRepository: IRestaurantWalletRepository,
		@inject(TYPES.Gateways.PaymentGateway)
		private readonly paymentGateway: IPaymentGateway,
		@inject(TYPES.Logger)
		private readonly logger: ILogger,
	) {}

	async execute(
		input: LinkRestaurantWalletBankAccountInputDTO,
	): Promise<LinkRestaurantWalletBankAccountOutputDTO> {
		const ifsc = input.ifsc.trim().toUpperCase();
		const accountNumber = input.accountNumber.trim();
		const accountHolderName = input.accountHolderName.trim();

		const wallet = await this.walletRepository.findByRestaurantId(input.restaurantId);

		if (!wallet) {
			throw new RestaurantWalletNotFoundError();
		}

		const previousFundAccountId = wallet.razorpayFundAccountId;

		// creates or retrieve contact
		const contact = wallet.razorpayContactId
			? await this.paymentGateway.getContact(wallet.razorpayContactId)
			: await this.paymentGateway.createContact(accountHolderName);

		let fundAccount: Awaited<ReturnType<IPaymentGateway['getFundAccount']>> | null = null;

		// if fundaccount exists checks if it is same account
		// if not create a new fundAccount and deactivates current one
		if (previousFundAccountId) {
			try {
				const existingFundAccount = await this.paymentGateway.getFundAccount(previousFundAccountId);

				const isSameAccount =
					existingFundAccount.accountNumber === accountNumber &&
					existingFundAccount.ifsc.toUpperCase() === ifsc &&
					existingFundAccount.accountHolderName.trim().toLowerCase() ===
						accountHolderName.toLowerCase() &&
					existingFundAccount.active;

				if (isSameAccount) {
					fundAccount = existingFundAccount;
				}
			} catch (error) {
				this.logger.error(
					{ err: error, fundAccountId: previousFundAccountId },
					'Failed to retrieve existing Razorpay fund account',
				);

				throw error;
			}
		}

		if (!fundAccount) {
			fundAccount = await this.paymentGateway.createFundAccount(
				contact.contactId,
				accountNumber,
				ifsc,
				accountHolderName,
			);
		}

		wallet.linkBankAccount(
			fundAccount.bankName,
			accountNumber,
			contact.contactId,
			fundAccount.fundAccountId,
		);

		await this.walletRepository.update(wallet.id, wallet);

		// if created new fund Account and prev exists deactivate the previous account
		if (previousFundAccountId && previousFundAccountId !== fundAccount.fundAccountId) {
			try {
				await this.paymentGateway.deactivateFundAccount(previousFundAccountId);
			} catch (error) {
				this.logger.error(
					{ err: error, fundAccountId: previousFundAccountId },
					'Failed to deactivate previous Razorpay fund account',
				);
			}
		}

		return LinkBankAccountMapper.toDto(fundAccount.bankName, wallet);
	}
}
