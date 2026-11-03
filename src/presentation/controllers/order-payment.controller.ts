import type { ICreateOrderPaymentUseCase } from '@application/ports/use-cases/create-order-payment.use-case.port.ts';
import type { IGetOrderPaymentStatusUseCase } from '@application/ports/use-cases/get-order-payment-status.use-case.port.ts';
import type { IVerifyOrderPaymentUseCase } from '@application/ports/use-cases/verify-order-payment.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { HTTP_STATUS, MESSAGES } from '@shared/constants/index.ts';
import { sendSuccessResponse } from '@shared/response/api-response.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';

@injectable()
export class OrderPaymentController {
	constructor(
		@inject(TYPES.UseCases.CreateOrderPaymentUseCase)
		private readonly createOrderPaymentUseCase: ICreateOrderPaymentUseCase,
		@inject(TYPES.UseCases.VerifyOrderPaymentUseCase)
		private readonly verifyOrderPaymentUseCase: IVerifyOrderPaymentUseCase,
		@inject(TYPES.UseCases.GetOrderPaymentStatusUseCase)
		private readonly getOrderPaymentStatusUseCase: IGetOrderPaymentStatusUseCase,
	) {}

	createGatewayOrder = async (req: Request, res: Response): Promise<void> => {
		const { orderId, customerId, restaurantId, amountPaise, currency } = req.body;

		const result = await this.createOrderPaymentUseCase.execute({
			orderId,
			customerId,
			restaurantId,
			amountPaise,
			currency,
		});

		sendSuccessResponse(res, result, MESSAGES.ORDER_GATEWAY_CREATED, HTTP_STATUS.CREATED);
	};

	verifyPayment = async (req: Request, res: Response): Promise<void> => {
		const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
		const customerId = req.user?.userId;

		const result = await this.verifyOrderPaymentUseCase.execute({
			orderId,
			razorpayOrderId,
			razorpayPaymentId,
			razorpaySignature,
			customerId,
		});

		sendSuccessResponse(res, result, MESSAGES.ORDER_PAYMENT_VERIFIED, HTTP_STATUS.OK);
	};

	getStatus = async (req: Request, res: Response): Promise<void> => {
		const orderId = req.params.orderId as string;
		const customerId = req.user?.userId;

		const result = await this.getOrderPaymentStatusUseCase.execute({
			orderId,
			customerId,
		});

		sendSuccessResponse(res, result, MESSAGES.ORDER_PAYMENT_STATUS_FETCHED, HTTP_STATUS.OK);
	};
}
