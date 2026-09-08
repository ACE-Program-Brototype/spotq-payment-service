import type { ICreateSubscriptionOrderUseCase } from '@application/ports/use-cases/create-subscription-order.use-case.port.ts';
import type { IGetSubscriptionPlansUseCase } from '@application/ports/use-cases/get-subscription-plans.use-case.port.ts';
import type { IGetSubscriptionStatusUseCase } from '@application/ports/use-cases/get-subscription-status.use-case.port.ts';
import type { IHandleWebhookUseCase } from '@application/ports/use-cases/handle-webhook.use-case.port.ts';
import type { IVerifyPaymentUseCase } from '@application/ports/use-cases/verify-payment.use-case.port.ts';
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
import {
	createSubscriptionOrderSchema,
	verifyPaymentSchema,
} from '../validators/subscription.validators.ts';

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
		@inject(TYPES.UseCases.VerifyPaymentUseCase)
		private readonly verifyPaymentUseCase: IVerifyPaymentUseCase,
		@inject(TYPES.UseCases.GetSubscriptionStatusUseCase)
		private readonly getSubscriptionStatusUseCase: IGetSubscriptionStatusUseCase,
		@inject(TYPES.UseCases.HandleWebhookUseCase)
		private readonly handleWebhookUseCase: IHandleWebhookUseCase,
	) {}

	getPlans = async (_req: Request, res: Response): Promise<void> => {
		try {
			const plans = await this.getSubscriptionPlansUseCase.execute();
			sendSuccessResponse(
				res,
				plans.map((p) => p.toJSON()),
				MESSAGES.SUBSCRIPTION_PLANS_FETCHED,
				HTTP_STATUS.OK,
			);
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	};

	createOrder = async (req: Request, res: Response): Promise<void> => {
		try {
			const validated = createSubscriptionOrderSchema.parse(req.body);

			const restaurantId = (req.headers['x-restaurant-id'] as string) || validated.restaurantId;

			if (!restaurantId) {
				sendErrorResponse(
					res,
					MESSAGES.UNAUTHORIZED_RESTAURANT,
					ERROR_CODES.UNAUTHORIZED,
					HTTP_STATUS.UNAUTHORIZED,
				);
				return;
			}

			const result = await this.createSubscriptionOrderUseCase.execute({
				restaurantId,
				planId: validated.planId,
				restaurantName: validated.restaurantName || (req.headers['x-restaurant-name'] as string),
				restaurantEmail: validated.restaurantEmail || (req.headers['x-user-email'] as string),
				restaurantPhone: validated.restaurantPhone,
			});

			sendSuccessResponse(res, result, MESSAGES.SUBSCRIPTION_ORDER_CREATED, HTTP_STATUS.CREATED);
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	};

	verifyPayment = async (req: Request, res: Response): Promise<void> => {
		try {
			const validated = verifyPaymentSchema.parse(req.body);
			const restaurantId = req.headers['x-restaurant-id'] as string;

			const result = await this.verifyPaymentUseCase.execute({
				razorpayOrderId: validated.razorpayOrderId,
				razorpayPaymentId: validated.razorpayPaymentId,
				razorpaySignature: validated.razorpaySignature,
				restaurantId,
			});

			sendSuccessResponse(res, result, MESSAGES.PAYMENT_VERIFIED_SUCCESS, HTTP_STATUS.OK);
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	};

	getStatus = async (req: Request, res: Response): Promise<void> => {
		try {
			const restaurantId =
				(req.params.restaurantId as string) || (req.headers['x-restaurant-id'] as string);

			if (!restaurantId) {
				sendErrorResponse(
					res,
					MESSAGES.UNAUTHORIZED_RESTAURANT,
					ERROR_CODES.UNAUTHORIZED,
					HTTP_STATUS.UNAUTHORIZED,
				);
				return;
			}

			const result = await this.getSubscriptionStatusUseCase.execute(restaurantId);
			sendSuccessResponse(res, result, MESSAGES.SUBSCRIPTION_STATUS_FETCHED, HTTP_STATUS.OK);
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	};

	handleWebhook = async (req: Request, res: Response): Promise<void> => {
		try {
			const signature = (req.headers['x-razorpay-signature'] as string) || '';
			const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

			const result = await this.handleWebhookUseCase.execute({
				rawBody,
				signature,
				parsedPayload: typeof req.body === 'object' ? req.body : JSON.parse(rawBody),
			});

			res.status(HTTP_STATUS.OK).json(result);
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	};

	private handleError(res: Response, error: unknown): void {
		if (error instanceof DomainError) {
			const statusCode = getStatusCodeForDomainError(error.code, HTTP_STATUS.BAD_REQUEST);
			sendErrorResponse(res, error.message, error.code, statusCode);
			return;
		}

		if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
			const zodError = error as unknown as { issues: unknown[] };
			sendErrorResponse(
				res,
				MESSAGES.VALIDATION_ERROR,
				ERROR_CODES.VALIDATION_ERROR,
				HTTP_STATUS.UNPROCESSABLE_ENTITY,
				zodError.issues,
			);
			return;
		}

		const message = error instanceof Error ? error.message : MESSAGES.INTERNAL_SERVER_ERROR;
		sendErrorResponse(
			res,
			message,
			ERROR_CODES.INTERNAL_SERVER_ERROR,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}
}
