import type { IGetRestaurantWalletOverviewUseCase } from '@application/ports/use-cases/restaurant-wallet/get-restaurant-wallet-overview.use-case.port';
import type { ILinkBankAccountUseCase } from '@application/ports/use-cases/restaurant-wallet/link-bank-account.use-case.port.ts';
import { TYPES } from '@di/types';
import { RestaurantIdNotFound } from '@domain/errors/restaurant.errors';
import { HTTP_STATUS, MESSAGES, sendSuccessResponse } from '@shared/index';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { z } from 'zod';

@injectable()
export class RestaurantWalletController {
	constructor(
		@inject(TYPES.UseCases.RestaurantWallet.GetRestaurantWalletOverviewUseCase)
		private readonly getRestaurantWalletOverviewUseCase: IGetRestaurantWalletOverviewUseCase,
		@inject(TYPES.UseCases.RestaurantWallet.LinkBankAccountUseCase)
		private readonly linkBankAccountUseCase: ILinkBankAccountUseCase,
	) {}

	getWalletOverview = async (req: Request, res: Response) => {
		const { restaurantId } = req.user ?? {};

		if (!restaurantId) {
			throw new RestaurantIdNotFound();
		}

		const response = await this.getRestaurantWalletOverviewUseCase.execute(restaurantId);

		return sendSuccessResponse(
			res,
			response,
			MESSAGES.GET_RESTAURANT_WALLET_OVERVIEW_SUCCESS,
			HTTP_STATUS.OK,
		);
	};

	linkBankAccount = async (req: Request, res: Response) => {
		const restaurantIdHeader = req.get('x-restaurant-id');
		if (!restaurantIdHeader) throw new RestaurantIdNotFound();

		const restaurantId = z.uuid().parse(restaurantIdHeader);
		const response = await this.linkBankAccountUseCase.execute({ restaurantId, ...req.body });

		return sendSuccessResponse(
			res,
			response,
			MESSAGES.LINK_RESTAURANT_WALLET_BANK_ACCOUNT_SUCCESS,
			HTTP_STATUS.OK,
		);
	};
}
