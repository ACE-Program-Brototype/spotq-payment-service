import type { IGetCustomerInvoiceUseCase } from '@application/ports/use-cases/customer-payment/get-customer-invoice.use-case.port.ts';
import type { IGetCustomerPaymentHistoryUseCase } from '@application/ports/use-cases/customer-payment/get-customer-payment-history.use-case.port.ts';
import type { IRetryCustomerPaymentUseCase } from '@application/ports/use-cases/customer-payment/retry-customer-payment.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	HTTP_STATUS,
	MESSAGES,
	PAGINATION,
	type PaymentSortField,
	type SortDirection,
} from '@shared/constants/index.ts';
import { sendSuccessResponse } from '@shared/response/api-response.ts';
import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';

@injectable()
export class CustomerPaymentController {
	constructor(
		@inject(TYPES.UseCases.GetCustomerPaymentHistoryUseCase)
		private readonly getCustomerPaymentHistoryUseCase: IGetCustomerPaymentHistoryUseCase,
		@inject(TYPES.UseCases.RetryCustomerPaymentUseCase)
		private readonly retryCustomerPaymentUseCase: IRetryCustomerPaymentUseCase,
		@inject(TYPES.UseCases.GetCustomerInvoiceUseCase)
		private readonly getCustomerInvoiceUseCase: IGetCustomerInvoiceUseCase,
	) {}

	getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
		const customerId = req.user?.userId as string;

		const result = await this.getCustomerPaymentHistoryUseCase.execute({
			customerId,
			page: req.query.page ? Number(req.query.page) : PAGINATION.DEFAULT_PAGE,
			limit: req.query.limit ? Number(req.query.limit) : PAGINATION.DEFAULT_LIMIT,
			status: (req.query.status as string) || null,
			startDate: (req.query.startDate as string) || null,
			endDate: (req.query.endDate as string) || null,
			sortBy: req.query.sortBy as PaymentSortField,
			sortOrder: req.query.sortOrder as SortDirection,
		});

		sendSuccessResponse(res, result, MESSAGES.PAYMENT_HISTORY_RETRIEVED, HTTP_STATUS.OK);
	};

	retryPayment = async (req: Request, res: Response): Promise<void> => {
		const customerId = req.user?.userId as string;
		const transactionId = req.params.id as string;

		const result = await this.retryCustomerPaymentUseCase.execute({
			transactionId,
			customerId,
		});

		sendSuccessResponse(res, result, MESSAGES.PAYMENT_RETRY_INITIATED, HTTP_STATUS.OK);
	};

	getInvoice = async (req: Request, res: Response): Promise<void> => {
		const customerId = req.user?.userId as string;
		const transactionId = req.params.id as string;

		const result = await this.getCustomerInvoiceUseCase.execute({
			transactionId,
			customerId,
		});

		sendSuccessResponse(res, result, MESSAGES.CUSTOMER_INVOICE_RETRIEVED, HTTP_STATUS.OK);
	};
}
