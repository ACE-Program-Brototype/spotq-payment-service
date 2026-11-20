import type { ListAdminSubscribersQueryDTO } from '@application/dtos/admin-subscribers/list-admin-subscribers.dto.ts';
import type { IGetAdminSubscriberDetailsUseCase } from '@application/ports/use-cases/admin-subscribers/get-admin-subscriber-details.use-case.port.ts';
import type { IGetAdminSubscribersUseCase } from '@application/ports/use-cases/admin-subscribers/get-admin-subscribers.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import { sendSuccessResponse } from '@shared/response/api-response.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';

@injectable()
export class AdminSubscriberController {
	constructor(
		@inject(TYPES.UseCases.GetAdminSubscribersUseCase)
		private readonly getAdminSubscribersUseCase: IGetAdminSubscribersUseCase,
		@inject(TYPES.UseCases.GetAdminSubscriberDetailsUseCase)
		private readonly getAdminSubscriberDetailsUseCase: IGetAdminSubscriberDetailsUseCase,
	) {}

	listSubscribers = async (req: Request, res: Response): Promise<void> => {
		const query = (res.locals.query ?? req.query) as unknown as ListAdminSubscribersQueryDTO;

		const result = await this.getAdminSubscribersUseCase.execute({
			page: Number(query.page),
			limit: Number(query.limit),
			status: query.status,
			search: query.search,
			sortBy: query.sortBy,
			sortOrder: query.sortOrder,
		});

		sendSuccessResponse(res, result, MESSAGES.SUBSCRIBERS_RETRIEVED, HTTP_STATUS.OK);
	};

	getSubscriberDetails = async (req: Request, res: Response): Promise<void> => {
		const params = (res.locals.params ?? req.params) as { subscriberId: string };

		const result = await this.getAdminSubscriberDetailsUseCase.execute({
			subscriberId: params.subscriberId,
		});

		sendSuccessResponse(res, result, MESSAGES.SUBSCRIBER_DETAILS_RETRIEVED, HTTP_STATUS.OK);
	};
}
