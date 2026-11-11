import type { WebhookPayload } from '@application/dtos/handle-webhook.dto.ts';
import type { ICreateSubscriptionOrderUseCase } from '@application/ports/use-cases/create-subscription-order.use-case.port.ts';
import type { IGetSubscriptionPlansUseCase } from '@application/ports/use-cases/get-subscription-plans.use-case.port.ts';
import type { IGetSubscriptionStatusUseCase } from '@application/ports/use-cases/get-subscription-status.use-case.port.ts';
import type { IHandleWebhookUseCase } from '@application/ports/use-cases/handle-webhook.use-case.port.ts';
import type { IRenewSubscriptionUseCase } from '@application/ports/use-cases/subscriptions/renew-subscription.use-case.port.ts';
import type { IVerifyPaymentUseCase } from '@application/ports/use-cases/verify-payment.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { getHeaderValue } from '@presentation/middleware/index.ts';
import type {
	RenewSubscriptionBodyDTO,
	RenewSubscriptionHeadersDTO,
	RenewSubscriptionParamsDTO,
} from '@presentation/validators/subscriptions/renew-subscription.validator.ts';
import { HTTP_HEADERS, HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import { BadRequestError, UnauthorizedError } from '@shared/errors/index.ts';
import { sendSuccessResponse } from '@shared/response/api-response.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type {
	CreateSubscriptionOrderDto,
	VerifyPaymentDto,
} from '../validators/subscription.validators.ts';

interface RequestWithRawBody extends Request {
	rawBody?: string;
}

/**
 * Controller handling HTTP requests for subscription plan discovery,
 * order creation, payment verification, and webhook processing.
 */
@injectable()
export class SubscriptionController {
	constructor(
		@inject(TYPES.UseCases.GetSubscriptionPlansUseCase)
		private readonly getSubscriptionPlansUseCase: IGetSubscriptionPlansUseCase,
		@inject(TYPES.UseCases.CreateSubscriptionOrderUseCase)
		private readonly createSubscriptionOrderUseCase: ICreateSubscriptionOrderUseCase,
		@inject(TYPES.UseCases.RenewSubscriptionUseCase)
		private readonly renewSubscriptionUseCase: IRenewSubscriptionUseCase,
		@inject(TYPES.UseCases.VerifyPaymentUseCase)
		private readonly verifyPaymentUseCase: IVerifyPaymentUseCase,
		@inject(TYPES.UseCases.GetSubscriptionStatusUseCase)
		private readonly getSubscriptionStatusUseCase: IGetSubscriptionStatusUseCase,
		@inject(TYPES.UseCases.HandleWebhookUseCase)
		private readonly handleWebhookUseCase: IHandleWebhookUseCase,
	) {}

	getPlans = async (_req: Request, res: Response): Promise<void> => {
		const plans = await this.getSubscriptionPlansUseCase.execute();
		sendSuccessResponse(
			res,
			plans.map((p) => p.toJSON()),
			MESSAGES.SUBSCRIPTION_PLANS_FETCHED,
			HTTP_STATUS.OK,
		);
	};

	createOrder = async (req: Request, res: Response): Promise<void> => {
		const body = req.body as CreateSubscriptionOrderDto;
		const restaurantId = getHeaderValue(req.headers['x-restaurant-id']);

		if (!restaurantId) {
			throw new UnauthorizedError(MESSAGES.UNAUTHORIZED_RESTAURANT);
		}

		const result = await this.createSubscriptionOrderUseCase.execute({
			restaurantId,
			planId: body.planId,
			restaurantName: body.restaurantName,
			restaurantEmail: body.restaurantEmail,
			restaurantPhone: body.restaurantPhone,
		});

		sendSuccessResponse(res, result, MESSAGES.SUBSCRIPTION_ORDER_CREATED, HTTP_STATUS.CREATED);
	};

	renewSubscription = async (req: Request, res: Response): Promise<void> => {
		const params = res.locals.params as RenewSubscriptionParamsDTO;
		const headers = res.locals.headers as RenewSubscriptionHeadersDTO;
		const body = req.body as RenewSubscriptionBodyDTO;
		const restaurantId = req.user?.restaurantId;

		if (!restaurantId) {
			throw new UnauthorizedError(MESSAGES.UNAUTHORIZED_RESTAURANT);
		}

		const { replayed, ...renewalOrder } = await this.renewSubscriptionUseCase.execute({
			subscriptionId: params.subscriptionId,
			restaurantId,
			idempotencyKey: headers[HTTP_HEADERS.IDEMPOTENCY_KEY],
			planId: body.planId,
			restaurantName: getHeaderValue(req.headers['x-restaurant-name']),
			restaurantEmail: req.user?.email,
			restaurantPhone: getHeaderValue(req.headers['x-user-phone']),
		});

		if (replayed) {
			res.setHeader(HTTP_HEADERS.IDEMPOTENCY_REPLAYED, 'true');
		}

		sendSuccessResponse(
			res,
			renewalOrder,
			MESSAGES.SUBSCRIPTION_RENEWAL_ORDER_CREATED,
			HTTP_STATUS.CREATED,
		);
	};

	verifyPayment = async (req: Request, res: Response): Promise<void> => {
		const body = req.body as VerifyPaymentDto;
		const restaurantId = getHeaderValue(req.headers['x-restaurant-id']);

		const result = await this.verifyPaymentUseCase.execute({
			razorpayOrderId: body.razorpayOrderId,
			razorpayPaymentId: body.razorpayPaymentId,
			razorpaySignature: body.razorpaySignature,
			restaurantId,
		});

		sendSuccessResponse(res, result, MESSAGES.PAYMENT_VERIFIED_SUCCESS, HTTP_STATUS.OK);
	};

	getStatus = async (req: Request, res: Response): Promise<void> => {
		const restaurantId = getHeaderValue(req.headers['x-restaurant-id']);

		if (!restaurantId) {
			throw new UnauthorizedError(MESSAGES.UNAUTHORIZED_RESTAURANT);
		}

		const result = await this.getSubscriptionStatusUseCase.execute(restaurantId);
		sendSuccessResponse(res, result, MESSAGES.SUBSCRIPTION_STATUS_FETCHED, HTTP_STATUS.OK);
	};

	getStatusByRestaurant = async (req: Request, res: Response): Promise<void> => {
		const restaurantId = req.params.restaurantId as string;

		if (!restaurantId) {
			throw new BadRequestError(MESSAGES.RESTAURANT_ID_NOT_FOUND);
		}

		const result = await this.getSubscriptionStatusUseCase.execute(restaurantId);
		sendSuccessResponse(res, result, MESSAGES.SUBSCRIPTION_STATUS_FETCHED, HTTP_STATUS.OK);
	};

	handleWebhook = async (req: Request, res: Response): Promise<void> => {
		const signature = getHeaderValue(req.headers['x-razorpay-signature']) ?? '';
		const rawBody = (req as RequestWithRawBody).rawBody;

		if (!rawBody) {
			throw new BadRequestError(MESSAGES.BAD_REQUEST);
		}

		if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
			throw new BadRequestError(MESSAGES.BAD_REQUEST);
		}

		const result = await this.handleWebhookUseCase.execute({
			rawBody,
			signature,
			parsedPayload: req.body as WebhookPayload,
		});

		sendSuccessResponse(res, result, MESSAGES.WEBHOOK_PROCESSED, HTTP_STATUS.OK);
	};
}
