import type { IGetRestaurantTransactionsUseCase } from '@application/ports/use-cases/transactions/get-restaurant-transactions.use-case.port.ts';
import type { IGetTransactionDetailUseCase } from '@application/ports/use-cases/transactions/get-transaction-detail.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { DomainError } from '@domain/errors/payment.errors.ts';
import {
	ERROR_CODES,
	getStatusCodeForDomainError,
	HTTP_STATUS,
	MESSAGES,
} from '@shared/constants/index.ts';
import { sendErrorResponse, sendSuccessResponse } from '@shared/response/api-response.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { ZodError } from 'zod';
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
		try {
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
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	};

	getTransactionDetail = async (req: Request, res: Response): Promise<void> => {
		try {
			const restaurantId = req.headers['x-restaurant-id'] as string;
			const params = getTransactionDetailParamsSchema.parse(req.params);

			const result = await this.getTransactionDetailUseCase.execute({
				restaurantId,
				transactionId: params.id,
			});

			sendSuccessResponse(res, result, MESSAGES.TRANSACTION_DETAILS_RETRIEVED, HTTP_STATUS.OK);
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	};

	private handleError(res: Response, error: unknown): void {
		if (error instanceof DomainError) {
			const statusCode = getStatusCodeForDomainError(error.code, HTTP_STATUS.BAD_REQUEST);
			sendErrorResponse(res, error.code, error.message, statusCode);
			return;
		}

		if (error instanceof ZodError) {
			const hasUuidError = error.issues.some(
				(issue) => issue.message === MESSAGES.INVALID_TRANSACTION_ID,
			);
			const hasDateRangeError = error.issues.some(
				(issue) => issue.message === MESSAGES.INVALID_DATE_RANGE,
			);

			if (hasUuidError) {
				sendErrorResponse(
					res,
					ERROR_CODES.BAD_REQUEST,
					MESSAGES.INVALID_TRANSACTION_ID,
					HTTP_STATUS.BAD_REQUEST,
				);
				return;
			}

			if (hasDateRangeError) {
				sendErrorResponse(
					res,
					ERROR_CODES.BAD_REQUEST,
					MESSAGES.INVALID_DATE_RANGE,
					HTTP_STATUS.BAD_REQUEST,
				);
				return;
			}

			sendErrorResponse(
				res,
				ERROR_CODES.VALIDATION_ERROR,
				MESSAGES.VALIDATION_ERROR,
				HTTP_STATUS.UNPROCESSABLE_ENTITY,
				error.issues,
			);
			return;
		}

		const message = error instanceof Error ? error.message : MESSAGES.TRANSACTIONS_QUERY_FAILED;
		sendErrorResponse(
			res,
			ERROR_CODES.INTERNAL_SERVER_ERROR,
			message,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}
}
