import { CreateSubscriptionOrderUseCase } from '@application/use-cases/create-subscription-order.use-case.ts';
import { GetSubscriptionPlansUseCase } from '@application/use-cases/get-subscription-plans.use-case.ts';
import { GetSubscriptionStatusUseCase } from '@application/use-cases/get-subscription-status.use-case.ts';
import { HandleWebhookUseCase } from '@application/use-cases/handle-webhook.use-case.ts';
import { VerifyPaymentUseCase } from '@application/use-cases/verify-payment.use-case.ts';
import { DomainError } from '@domain/errors/payment.errors.ts';
import { razorpayGateway } from '@infrastructure/payment/razorpay.gateway.ts';
import { paymentTransactionRepository } from '@infrastructure/repositories/prisma-payment-transaction.repository.ts';
import { subscriptionRepository } from '@infrastructure/repositories/prisma-subscription.repository.ts';
import { subscriptionPlanRepository } from '@infrastructure/repositories/prisma-subscription-plan.repository.ts';
import { getStatusCodeForDomainError, HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import { ErrorResponse, SuccessResponse } from '@shared/utils/response.ts';
import type { Request, Response } from 'express';
import {
	createSubscriptionOrderSchema,
	verifyPaymentSchema,
} from '../validators/subscription.validators.ts';

export class SubscriptionController {
	private readonly getSubscriptionPlansUseCase = new GetSubscriptionPlansUseCase(
		subscriptionPlanRepository,
	);
	private readonly createSubscriptionOrderUseCase = new CreateSubscriptionOrderUseCase(
		subscriptionPlanRepository,
		subscriptionRepository,
		paymentTransactionRepository,
		razorpayGateway,
	);
	private readonly verifyPaymentUseCase = new VerifyPaymentUseCase(razorpayGateway);
	private readonly getSubscriptionStatusUseCase = new GetSubscriptionStatusUseCase(
		subscriptionRepository,
		subscriptionPlanRepository,
	);
	private readonly handleWebhookUseCase = new HandleWebhookUseCase(razorpayGateway);

	async getPlans(_req: Request, res: Response): Promise<void> {
		try {
			const plans = await this.getSubscriptionPlansUseCase.execute();
			res.status(HTTP_STATUS.OK).json(
				new SuccessResponse(
					MESSAGES.SUBSCRIPTION_PLANS_FETCHED,
					plans.map((p) => p.toJSON()),
				),
			);
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	}

	async createOrder(req: Request, res: Response): Promise<void> {
		try {
			const validated = createSubscriptionOrderSchema.parse(req.body);

			// Extract restaurant ID from Envoy header or validated request body
			const restaurantId =
				(req.headers['x-restaurant-id'] as string) ||
				validated.restaurantId ||
				(req.headers['x-user-id'] as string);

			if (!restaurantId) {
				res
					.status(HTTP_STATUS.UNAUTHORIZED)
					.json(new ErrorResponse('UNAUTHORIZED', MESSAGES.UNAUTHORIZED_RESTAURANT));
				return;
			}

			const result = await this.createSubscriptionOrderUseCase.execute({
				restaurantId,
				planId: validated.planId,
				restaurantName: validated.restaurantName || (req.headers['x-restaurant-name'] as string),
				restaurantEmail: validated.restaurantEmail || (req.headers['x-user-email'] as string),
				restaurantPhone: validated.restaurantPhone,
			});

			res
				.status(HTTP_STATUS.CREATED)
				.json(new SuccessResponse(MESSAGES.SUBSCRIPTION_ORDER_CREATED, result));
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	}

	async verifyPayment(req: Request, res: Response): Promise<void> {
		try {
			const validated = verifyPaymentSchema.parse(req.body);
			const restaurantId =
				(req.headers['x-restaurant-id'] as string) || (req.headers['x-user-id'] as string);

			const result = await this.verifyPaymentUseCase.execute({
				razorpayOrderId: validated.razorpayOrderId,
				razorpayPaymentId: validated.razorpayPaymentId,
				razorpaySignature: validated.razorpaySignature,
				restaurantId,
			});

			res
				.status(HTTP_STATUS.OK)
				.json(new SuccessResponse(MESSAGES.PAYMENT_VERIFIED_SUCCESS, result));
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	}

	async getStatus(req: Request, res: Response): Promise<void> {
		try {
			const restaurantId =
				(req.params.restaurantId as string) ||
				(req.headers['x-restaurant-id'] as string) ||
				(req.headers['x-user-id'] as string);

			if (!restaurantId) {
				res
					.status(HTTP_STATUS.UNAUTHORIZED)
					.json(new ErrorResponse('UNAUTHORIZED', MESSAGES.UNAUTHORIZED_RESTAURANT));
				return;
			}

			const result = await this.getSubscriptionStatusUseCase.execute(restaurantId);
			res
				.status(HTTP_STATUS.OK)
				.json(new SuccessResponse(MESSAGES.SUBSCRIPTION_STATUS_FETCHED, result));
		} catch (error: unknown) {
			this.handleError(res, error);
		}
	}

	async handleWebhook(req: Request, res: Response): Promise<void> {
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
	}

	private handleError(res: Response, error: unknown): void {
		if (error instanceof DomainError) {
			const statusCode = getStatusCodeForDomainError(error.code, HTTP_STATUS.BAD_REQUEST);
			res.status(statusCode).json(new ErrorResponse(error.code, error.message));
			return;
		}

		if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
			const zodError = error as unknown as { issues: unknown[] };
			res
				.status(HTTP_STATUS.UNPROCESSABLE_ENTITY)
				.json(new ErrorResponse('VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, zodError.issues));
			return;
		}

		const message = error instanceof Error ? error.message : MESSAGES.INTERNAL_SERVER_ERROR;
		res
			.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
			.json(new ErrorResponse('INTERNAL_SERVER_ERROR', message));
	}
}

export const subscriptionController = new SubscriptionController();
