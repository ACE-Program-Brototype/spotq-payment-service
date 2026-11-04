import type { IGetAdminSubscriberDetailsUseCase } from '@application/ports/use-cases/admin-subscribers/get-admin-subscriber-details.use-case.port.ts';
import type { IGetAdminSubscribersUseCase } from '@application/ports/use-cases/admin-subscribers/get-admin-subscribers.use-case.port.ts';
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
import { getAdminSubscriberDetailsParamsSchema } from '../validators/admin-subscribers/get-admin-subscriber-details.validator.ts';
import { listAdminSubscribersQuerySchema } from '../validators/admin-subscribers/list-admin-subscribers.validator.ts';

@injectable()
export class AdminSubscriberController {
	constructor(
		@inject(TYPES.UseCases.GetAdminSubscribersUseCase)
		private readonly getAdminSubscribersUseCase: IGetAdminSubscribersUseCase,
		@inject(TYPES.UseCases.GetAdminSubscriberDetailsUseCase)
		private readonly getAdminSubscriberDetailsUseCase: IGetAdminSubscriberDetailsUseCase,
	) {}

	listSubscribers = async (req: Request, res: Response): Promise<void> => {
		try {
			const query = listAdminSubscribersQuerySchema.parse(req.query);

			const result = await this.getAdminSubscribersUseCase.execute({
				page: query.page,
				limit: query.limit,
				status: query.status,
				search: query.search,
				sortBy: query.sortBy,
				sortOrder: query.sortOrder,
			});

			sendSuccessResponse(res, result, MESSAGES.SUBSCRIBERS_RETRIEVED, HTTP_STATUS.OK);
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	};

	getSubscriberDetails = async (req: Request, res: Response): Promise<void> => {
		try {
			const params = getAdminSubscriberDetailsParamsSchema.parse(req.params);

			const result = await this.getAdminSubscriberDetailsUseCase.execute({
				subscriberId: params.subscriberId,
			});

			sendSuccessResponse(res, result, MESSAGES.SUBSCRIBER_DETAILS_RETRIEVED, HTTP_STATUS.OK);
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
			sendErrorResponse(
				res,
				ERROR_CODES.BAD_REQUEST,
				error.issues[0]?.message || MESSAGES.VALIDATION_ERROR,
				HTTP_STATUS.BAD_REQUEST,
				error.issues,
			);
			return;
		}

		sendErrorResponse(
			res,
			ERROR_CODES.INTERNAL_SERVER_ERROR,
			MESSAGES.INTERNAL_SERVER_ERROR,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}
}
