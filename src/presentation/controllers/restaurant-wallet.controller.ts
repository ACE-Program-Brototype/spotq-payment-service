import type { IGetRestaurantWalletOverviewUseCase } from '@application/ports/use-cases/get-restaurant-wallet-overview.use-case.port';
import { TYPES } from '@di/types';
import { RestaurantIdNotFound } from '@domain/errors/restaurant.errors';
import { HTTP_STATUS, MESSAGES, sendSuccessResponse } from '@shared/index';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';

@injectable()
export class RestaurantWalletController {
	constructor(
		@inject(TYPES.UseCases.RestaurantWallet.GetRestaurantWalletOverviewUseCase)
		private readonly getRestaurantWalletOverviewUseCase: IGetRestaurantWalletOverviewUseCase,
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
}
