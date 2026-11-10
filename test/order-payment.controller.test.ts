import type { ICreateOrderPaymentUseCase } from '@application/ports/use-cases/create-order-payment.use-case.port.ts';
import type { IGetOrderPaymentStatusUseCase } from '@application/ports/use-cases/get-order-payment-status.use-case.port.ts';
import type { IProcessOrderRefundUseCase } from '@application/ports/use-cases/process-order-refund.use-case.port.ts';
import type { IVerifyOrderPaymentUseCase } from '@application/ports/use-cases/verify-order-payment.use-case.port.ts';
import { OrderPaymentController } from '@presentation/controllers/order-payment.controller.ts';
import { HTTP_STATUS, MESSAGES, REFUND_STATUS } from '@shared/constants/index.ts';
import type { Request, Response } from 'express';

describe('OrderPaymentController - processRefund', () => {
	let mockCreateUseCase: jest.Mocked<ICreateOrderPaymentUseCase>;
	let mockVerifyUseCase: jest.Mocked<IVerifyOrderPaymentUseCase>;
	let mockStatusUseCase: jest.Mocked<IGetOrderPaymentStatusUseCase>;
	let mockRefundUseCase: jest.Mocked<IProcessOrderRefundUseCase>;
	let controller: OrderPaymentController;

	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;

	beforeEach(() => {
		mockCreateUseCase = {} as jest.Mocked<ICreateOrderPaymentUseCase>;
		mockVerifyUseCase = {} as jest.Mocked<IVerifyOrderPaymentUseCase>;
		mockStatusUseCase = {} as jest.Mocked<IGetOrderPaymentStatusUseCase>;
		mockRefundUseCase = {
			execute: jest.fn().mockResolvedValue({
				refundId: 'rfnd_OEd92m8F05s9jKa',
				transactionId: '8e329a17-6421-4f3a-bfda-90e94bb10022',
				orderId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
				amountPaise: 86800,
				currency: 'INR',
				status: REFUND_STATUS.PROCESSED,
				processedAt: '2026-11-04T12:00:00.000Z',
			}),
		};

		controller = new OrderPaymentController(
			mockCreateUseCase,
			mockVerifyUseCase,
			mockStatusUseCase,
			mockRefundUseCase,
		);

		mockReq = {
			headers: {
				'x-idempotency-key': 'idemp-123',
			},
			body: {
				orderId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
				amountPaise: 86800,
				reason: 'CUSTOMER_CANCELLED',
			},
		};

		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		};
	});

	it('should process refund and return 200 OK with formatted ApiResponse', async () => {
		await controller.processRefund(mockReq as Request, mockRes as Response);

		expect(mockRefundUseCase.execute).toHaveBeenCalledWith({
			orderId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
			amountPaise: 86800,
			reason: 'CUSTOMER_CANCELLED',
			notes: undefined,
		});

		expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				message: MESSAGES.REFUND_PROCESSED,
				data: expect.objectContaining({
					refundId: 'rfnd_OEd92m8F05s9jKa',
					status: 'PROCESSED',
				}),
			}),
		);
	});
});
