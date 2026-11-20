import { ProcessOrderRefundUseCase } from '@application/use-cases/order-payment/process-order-refund.use-case.ts';
import { PaymentRefund } from '@domain/entities/payment-refund.entity.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import {
	CannotRefundUncapturedPaymentError,
	PaymentAlreadyRefundedError,
	PaymentGatewayError,
	PaymentOrderNotFoundError,
	RefundAmountExceedsBalanceError,
	RefundAmountInvalidError,
} from '@domain/errors/payment.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import {
	DEFAULT_REFUND_SPEED,
	RAZORPAY_REFUND_STATUS,
	REFUND_STATUS,
} from '@shared/constants/index.ts';

describe('ProcessOrderRefundUseCase', () => {
	let mockGateway: jest.Mocked<IPaymentGateway>;
	let mockTxRepo: jest.Mocked<IPaymentTransactionRepository>;
	let useCase: ProcessOrderRefundUseCase;

	const mockOrderId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
	const mockTransactionId = '8e329a17-6421-4f3a-bfda-90e94bb10022';
	const mockPaymentId = 'pay_OEd92m8F05s9jKa';

	const createMockTransaction = (
		status: 'CAPTURED' | 'SUCCESS' | 'CREATED' | 'FAILED' | 'REFUNDED' = 'CAPTURED',
	) =>
		new PaymentTransaction({
			id: mockTransactionId,
			restaurantId: 'rest-123',
			orderId: mockOrderId,
			customerId: 'cust-123',
			razorpayOrderId: 'order_123',
			razorpayPaymentId: mockPaymentId,
			amountPaise: 86800,
			currency: 'INR',
			status,
		});

	beforeEach(() => {
		mockGateway = {
			initialize: jest.fn().mockResolvedValue(undefined),
			isHealthy: jest.fn().mockReturnValue(true),
			createOrder: jest.fn(),
			verifyPaymentSignature: jest.fn().mockReturnValue(true),
			verifyWebhookSignature: jest.fn().mockReturnValue(true),
			getPaymentDetails: jest.fn(),
			createRefund: jest.fn().mockResolvedValue({
				refundId: 'rfnd_OEd92m8F05s9jKa',
				paymentId: mockPaymentId,
				amount: 86800,
				currency: 'INR',
				status: RAZORPAY_REFUND_STATUS.PROCESSED,
				arn: '123456789012',
			}),
		} as unknown as jest.Mocked<IPaymentGateway>;

		mockTxRepo = {
			findById: jest.fn().mockResolvedValue(createMockTransaction()),
			findByOrderId: jest.fn(),
			findByCustomerOrderId: jest.fn().mockResolvedValue(createMockTransaction()),
			findRefundByPaymentTransactionId: jest.fn(),
			findCapturedByOrderId: jest.fn(),
			findByPaymentId: jest.fn(),
			findPendingByRestaurantAndPlan: jest.fn(),
			findPendingRenewalBySubscriptionAndPlan: jest.fn(),
			create: jest.fn(),
			captureOrderPaymentWithOutbox: jest.fn(),
			failOrderPaymentWithOutbox: jest.fn(),
			processOrderRefund: jest.fn().mockImplementation(async (params) => {
				const tx = createMockTransaction('REFUNDED');
				const refund = new PaymentRefund({
					id: 'refund-db-id',
					paymentTransactionId: params.transaction.id,
					razorpayRefundId: params.refund.razorpayRefundId,
					amountPaise: params.refund.amountPaise,
					currency: params.refund.currency,
					status: params.refund.status,
					reason: params.refund.reason,
					arn: params.refund.arn,
					paymentMethod: params.refund.paymentMethod,
					processedAt: new Date('2026-11-04T12:00:00.000Z'),
				});
				return { transaction: tx, refund };
			}),
			markSuccess: jest.fn(),
			markFailed: jest.fn(),
			resetToCreated: jest.fn(),
			syncRefundFromWebhook: jest.fn().mockResolvedValue(undefined),
		};

		useCase = new ProcessOrderRefundUseCase(mockGateway, mockTxRepo);
	});

	it('should process refund successfully when given valid orderId', async () => {
		const result = await useCase.execute({
			orderId: mockOrderId,
			amountPaise: 86800,
			reason: 'CUSTOMER_CANCELLED',
			notes: 'Cancelled before kitchen acceptance',
		});

		expect(result).toEqual({
			refundId: 'rfnd_OEd92m8F05s9jKa',
			transactionId: mockTransactionId,
			orderId: mockOrderId,
			amountPaise: 86800,
			currency: 'INR',
			status: REFUND_STATUS.PROCESSED,
			processedAt: expect.any(String),
		});

		expect(mockGateway.createRefund).toHaveBeenCalledWith({
			paymentId: mockPaymentId,
			amountInPaise: 86800,
			speed: DEFAULT_REFUND_SPEED,
			notes: {
				orderId: mockOrderId,
				transactionId: mockTransactionId,
				reason: 'CUSTOMER_CANCELLED',
				notes: 'Cancelled before kitchen acceptance',
			},
		});

		expect(mockTxRepo.processOrderRefund).toHaveBeenCalledWith({
			transaction: expect.objectContaining({ id: mockTransactionId }),
			refund: {
				razorpayRefundId: 'rfnd_OEd92m8F05s9jKa',
				amountPaise: 86800,
				currency: 'INR',
				status: REFUND_STATUS.PROCESSED,
				reason: 'CUSTOMER_CANCELLED',
				arn: '123456789012',
				paymentMethod: 'ONLINE',
			},
		});
	});

	it('should default to full transaction amount when amountPaise is omitted', async () => {
		await useCase.execute({
			orderId: mockOrderId,
		});

		expect(mockGateway.createRefund).toHaveBeenCalledWith(
			expect.objectContaining({
				amountInPaise: 86800,
			}),
		);
	});

	it('should throw RefundAmountExceedsBalanceError when requested amount exceeds transaction amount', async () => {
		await expect(
			useCase.execute({
				orderId: mockOrderId,
				amountPaise: 99999,
			}),
		).rejects.toThrow(RefundAmountExceedsBalanceError);
	});

	it('should throw RefundAmountInvalidError when requested amount does not match full transaction amount', async () => {
		await expect(
			useCase.execute({
				orderId: mockOrderId,
				amountPaise: 40000,
			}),
		).rejects.toThrow(RefundAmountInvalidError);
	});

	it('should throw PaymentOrderNotFoundError when transaction is not found', async () => {
		mockTxRepo.findById.mockResolvedValue(null);
		mockTxRepo.findByCustomerOrderId.mockResolvedValue(null);

		await expect(
			useCase.execute({
				orderId: 'non-existent-order',
			}),
		).rejects.toThrow(PaymentOrderNotFoundError);
	});

	it('should throw PaymentAlreadyRefundedError when transaction is already refunded', async () => {
		mockTxRepo.findByCustomerOrderId.mockResolvedValue(createMockTransaction('REFUNDED'));

		await expect(
			useCase.execute({
				orderId: mockOrderId,
			}),
		).rejects.toThrow(PaymentAlreadyRefundedError);
	});

	it('should throw CannotRefundUncapturedPaymentError when transaction status is CREATED', async () => {
		mockTxRepo.findByCustomerOrderId.mockResolvedValue(createMockTransaction('CREATED'));

		await expect(
			useCase.execute({
				orderId: mockOrderId,
			}),
		).rejects.toThrow(CannotRefundUncapturedPaymentError);
	});

	it('should throw CannotRefundUncapturedPaymentError when transaction status is FAILED', async () => {
		mockTxRepo.findByCustomerOrderId.mockResolvedValue(createMockTransaction('FAILED'));

		await expect(
			useCase.execute({
				orderId: mockOrderId,
			}),
		).rejects.toThrow(CannotRefundUncapturedPaymentError);
	});

	it('should throw PaymentGatewayError when gateway throws an error', async () => {
		mockGateway.createRefund.mockRejectedValue(new Error('Gateway timeout'));

		await expect(
			useCase.execute({
				orderId: mockOrderId,
			}),
		).rejects.toThrow(PaymentGatewayError);
	});

	it('should mark refund as PENDING and transition transaction to REFUNDED when gateway returns pending status', async () => {
		const mockTx = createMockTransaction();
		const markRefundedSpy = jest.spyOn(mockTx, 'markRefunded');
		mockTxRepo.findByCustomerOrderId.mockResolvedValueOnce(mockTx);

		mockGateway.createRefund.mockResolvedValueOnce({
			refundId: 'rfnd_pending_123',
			paymentId: mockPaymentId,
			amount: 86800,
			currency: 'INR',
			status: RAZORPAY_REFUND_STATUS.PENDING,
		});

		mockTxRepo.processOrderRefund.mockImplementationOnce(async (params) => {
			const refundedTx = createMockTransaction('REFUNDED');
			const refund = new PaymentRefund({
				id: 'refund-pending-id',
				paymentTransactionId: params.transaction.id,
				razorpayRefundId: params.refund.razorpayRefundId,
				amountPaise: params.refund.amountPaise,
				currency: params.refund.currency,
				status: params.refund.status,
				reason: params.refund.reason,
				arn: params.refund.arn,
				paymentMethod: params.refund.paymentMethod,
				processedAt: null,
			});
			return { transaction: refundedTx, refund };
		});

		const result = await useCase.execute({
			orderId: mockOrderId,
		});

		expect(result.status).toBe(REFUND_STATUS.PENDING);
		expect(result.processedAt).toBeNull();
		expect(markRefundedSpy).toHaveBeenCalled();
		expect(mockTxRepo.processOrderRefund).toHaveBeenCalledWith(
			expect.objectContaining({
				refund: expect.objectContaining({
					status: REFUND_STATUS.PENDING,
				}),
			}),
		);
	});
});
