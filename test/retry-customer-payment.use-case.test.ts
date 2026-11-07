import { RetryCustomerPaymentUseCase } from '@application/use-cases/customer-payment/retry-customer-payment.use-case.ts';
import {
	PaymentTransaction,
	type PaymentTransactionProps,
} from '@domain/entities/payment-transaction.entity.ts';
import {
	AlreadyPaidError,
	CustomerUnauthorizedError,
	OrderExpiredError,
	PaymentNotRetryableError,
} from '@domain/errors/payment.errors.ts';
import { TransactionNotFoundError } from '@domain/errors/transaction.errors.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import { PAYMENT_STATUS } from '@shared/constants/index.ts';

describe('RetryCustomerPaymentUseCase (SCRUM-35)', () => {
	let mockRepo: jest.Mocked<IPaymentTransactionRepository>;
	let useCase: RetryCustomerPaymentUseCase;

	const customerId = 'cust-123';
	const orderId = 'order-456';
	const transactionId = 'tx-789';
	const razorpayOrderId = 'order_EK98a123cd45';

	const createMockTransaction = (overrides?: Partial<PaymentTransactionProps>) => {
		return new PaymentTransaction({
			id: transactionId,
			restaurantId: 'rest-111',
			customerId,
			orderId,
			razorpayOrderId,
			amountPaise: 54000,
			currency: 'INR',
			status: PAYMENT_STATUS.FAILED,
			failureReason: 'Payment timed out',
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		});
	};

	beforeEach(() => {
		mockRepo = {
			findById: jest.fn(),
			findByOrderId: jest.fn(),
			findByCustomerOrderId: jest.fn(),
			findByPaymentId: jest.fn(),
			findCapturedByOrderId: jest.fn(),
			findPendingByRestaurantAndPlan: jest.fn(),
			create: jest.fn(),
			captureOrderPaymentWithOutbox: jest.fn(),
			failOrderPaymentWithOutbox: jest.fn(),
			markSuccess: jest.fn(),
			markFailed: jest.fn(),
			resetToCreated: jest.fn(),
		};
		useCase = new RetryCustomerPaymentUseCase(mockRepo);
	});

	it('should throw TransactionNotFoundError when transaction does not exist', async () => {
		mockRepo.findById.mockResolvedValueOnce(null);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			TransactionNotFoundError,
		);
	});

	it('should throw CustomerUnauthorizedError when transaction belongs to another customer', async () => {
		const tx = createMockTransaction({ customerId: 'different-customer' });
		mockRepo.findById.mockResolvedValueOnce(tx);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			CustomerUnauthorizedError,
		);
	});

	it('should throw CustomerUnauthorizedError when transaction has no customerId (e.g. B2B SaaS subscription)', async () => {
		const tx = createMockTransaction({ customerId: null });
		mockRepo.findById.mockResolvedValueOnce(tx);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			CustomerUnauthorizedError,
		);
	});

	it('should throw PaymentNotRetryableError when transaction status is not FAILED', async () => {
		const tx = createMockTransaction({ status: PAYMENT_STATUS.CAPTURED });
		mockRepo.findById.mockResolvedValueOnce(tx);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			PaymentNotRetryableError,
		);
	});

	it('should throw AlreadyPaidError when order has already been captured on another attempt', async () => {
		const tx = createMockTransaction({ status: PAYMENT_STATUS.FAILED });
		const siblingCaptured = createMockTransaction({
			id: 'tx-sibling-captured',
			status: PAYMENT_STATUS.CAPTURED,
		});
		mockRepo.findById.mockResolvedValueOnce(tx);
		mockRepo.findCapturedByOrderId.mockResolvedValueOnce(siblingCaptured);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(AlreadyPaidError);
	});

	it('should throw OrderExpiredError when failed transaction is older than 15 minutes', async () => {
		const sixteenMinutesAgo = new Date(Date.now() - 16 * 60 * 1000);
		const tx = createMockTransaction({
			status: PAYMENT_STATUS.FAILED,
			createdAt: sixteenMinutesAgo,
		});
		mockRepo.findById.mockResolvedValueOnce(tx);
		mockRepo.findCapturedByOrderId.mockResolvedValueOnce(null);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(OrderExpiredError);
	});

	it('should reset transaction in-place to CREATED and return retry details', async () => {
		const tx = createMockTransaction({ status: PAYMENT_STATUS.FAILED });
		const resetTx = createMockTransaction({
			status: PAYMENT_STATUS.CREATED,
			failureReason: null,
		});

		mockRepo.findById.mockResolvedValueOnce(tx);
		mockRepo.findCapturedByOrderId.mockResolvedValueOnce(null);
		mockRepo.resetToCreated.mockResolvedValueOnce(resetTx);

		const result = await useCase.execute({ transactionId, customerId });

		expect(mockRepo.resetToCreated).toHaveBeenCalledWith(tx);
		expect(result).toEqual({
			transactionId,
			orderId,
			razorpayOrderId,
			amountPaise: 54000,
			amountInRupees: 540,
			currency: 'INR',
			keyId: expect.any(String),
		});
	});
});
