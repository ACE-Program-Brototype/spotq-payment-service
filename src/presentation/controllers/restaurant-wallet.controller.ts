import type { IGetRestaurantWalletOverviewUseCase } from '@application/ports/use-cases/restaurant-wallet/get-restaurant-wallet-overview.use-case.port';
import type { ILinkBankAccountUseCase } from '@application/ports/use-cases/restaurant-wallet/link-bank-account.use-case.port.ts';
import type { IListWalletLedgerEntriesUseCase } from '@application/ports/use-cases/restaurant-wallet/list-wallet-ledger-entries.use-case.port.ts';
import type { IWithdrawFromRestaurantWalletUseCase } from '@application/ports/use-cases/restaurant-wallet/withdraw-from-restaurant-wallet.use-case.port.ts';
import { TYPES } from '@di/types';
import { RestaurantIdNotFound } from '@domain/errors/restaurant.errors';
import type { LinkBankAccountBody } from '@presentation/validators/restaurant-wallet/link-bank-account.validator';
import type { ListWalletLedgerEntriesQuery } from '@presentation/validators/restaurant-wallet/list-wallet-ledger-entries.validator.ts';
import type { WithdrawFromRestaurantWalletBody } from '@presentation/validators/restaurant-wallet/withdraw-from-restaurant-wallet.validator.ts';
import { HTTP_STATUS, MESSAGES, sendSuccessResponse } from '@shared/index';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';

@injectable()
export class RestaurantWalletController {
	constructor(
		@inject(TYPES.UseCases.RestaurantWallet.GetRestaurantWalletOverviewUseCase)
		private readonly getRestaurantWalletOverviewUseCase: IGetRestaurantWalletOverviewUseCase,
		@inject(TYPES.UseCases.RestaurantWallet.LinkBankAccountUseCase)
		private readonly linkBankAccountUseCase: ILinkBankAccountUseCase,
		@inject(TYPES.UseCases.RestaurantWallet.WithdrawFromRestaurantWalletUseCase)
		private readonly withdrawFromRestaurantWalletUseCase: IWithdrawFromRestaurantWalletUseCase,
		@inject(TYPES.UseCases.RestaurantWallet.ListWalletLedgerEntriesUseCase)
		private readonly listWalletLedgerEntriesUseCase: IListWalletLedgerEntriesUseCase,
	) {}

	getWalletOverview = async (req: Request, res: Response) => {
		const { restaurantId } = req.user ?? {};

		if (!restaurantId) {
			throw new RestaurantIdNotFound();
		}

		const response = await this.getRestaurantWalletOverviewUseCase.execute(restaurantId);

		sendSuccessResponse(
			res,
			response,
			MESSAGES.GET_RESTAURANT_WALLET_OVERVIEW_SUCCESS,
			HTTP_STATUS.OK,
		);
	};

	linkBankAccount = async (req: Request, res: Response) => {
		const { restaurantId } = req.user ?? {};
		const { accountHolderName, accountNumber, ifsc } = req.body as LinkBankAccountBody;
		if (!restaurantId) throw new RestaurantIdNotFound();

		const response = await this.linkBankAccountUseCase.execute({
			restaurantId,
			accountHolderName,
			accountNumber,
			ifsc,
		});

		sendSuccessResponse(
			res,
			response,
			MESSAGES.LINK_RESTAURANT_WALLET_BANK_ACCOUNT_SUCCESS,
			HTTP_STATUS.OK,
		);
	};

	withdraw = async (req: Request, res: Response) => {
		const { restaurantId } = req.user ?? {};
		const { amountPaise, mode } = req.body as WithdrawFromRestaurantWalletBody;

		if (!restaurantId) throw new RestaurantIdNotFound();

		const response = await this.withdrawFromRestaurantWalletUseCase.execute({
			restaurantId,
			amountPaise,
			mode,
		});

		sendSuccessResponse(res, response, MESSAGES.WITHDRAWAL_INITIATED_SUCCESS, HTTP_STATUS.OK);
	};

	listLedgerEntries = async (req: Request, res: Response): Promise<void> => {
		const query = res.locals.query as ListWalletLedgerEntriesQuery;
		const { restaurantId } = req.user ?? {};

		if (!restaurantId) throw new RestaurantIdNotFound();

		const result = await this.listWalletLedgerEntriesUseCase.execute({
			restaurantId,
			...query,
		});

		sendSuccessResponse(res, result, MESSAGES.WALLET_LEDGER_ENTRIES_RETRIEVED, HTTP_STATUS.OK);
	};
}
