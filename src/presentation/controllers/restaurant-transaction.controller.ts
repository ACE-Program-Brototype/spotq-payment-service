import type { IGetRestaurantTransactionsUseCase } from '@application/ports/use-cases/transactions/get-restaurant-transactions.use-case.port.ts';
import type { IGetTransactionDetailUseCase } from '@application/ports/use-cases/transactions/get-transaction-detail.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import { sendSuccessResponse } from '@shared/response/api-response.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { getTransactionDetailParamsSchema } from '../validators/transactions/get-transaction-detail.validator.ts';
import { listTransactionsQuerySchema } from '../validators/transactions/list-transactions.validator.ts';

@injectable()
export class RestaurantTransactionController {
	constructor(
		@inject(TYPES.UseCases.GetRestaurantTransactionsUseCase)
		private readonly getRestaurantTransactionsUseCase: IGetRestaurantTransactionsUseCase,
		@inject(TYPES.UseCases.GetTransactionDetailUseCase)
		private readonly getTransactionDetailUseCase: IGetTransactionDetailUseCase,
	) {}

	listTransactions = async (req: Request, res: Response): Promise<void> => {
		const restaurantId = req.headers['x-restaurant-id'] as string;
		const query = listTransactionsQuerySchema.parse(req.query);

		const result = await this.getRestaurantTransactionsUseCase.execute({
			restaurantId,
			page: query.page,
			limit: query.limit,
			search: query.search,
			status: query.status,
			method: query.method,
			startDate: query.startDate,
			endDate: query.endDate,
			minAmount: query.minAmount,
			maxAmount: query.maxAmount,
			sortBy: query.sortBy,
			sortOrder: query.sortOrder,
		});

		sendSuccessResponse(res, result, MESSAGES.TRANSACTIONS_RETRIEVED, HTTP_STATUS.OK);
	};

	getTransactionDetail = async (req: Request, res: Response): Promise<void> => {
		const restaurantId = req.headers['x-restaurant-id'] as string;
		const params = getTransactionDetailParamsSchema.parse(req.params);

		const result = await this.getTransactionDetailUseCase.execute({
			restaurantId,
			transactionId: params.id,
		});

		sendSuccessResponse(res, result, MESSAGES.TRANSACTION_DETAILS_RETRIEVED, HTTP_STATUS.OK);
	};
}
