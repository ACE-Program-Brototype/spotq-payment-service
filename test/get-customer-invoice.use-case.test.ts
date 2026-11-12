import type { IStorageService } from '@application/ports/services/storage.service.port.ts';
import { GetCustomerInvoiceUseCase } from '@application/use-cases/customer-payment/get-customer-invoice.use-case.ts';
import {
	BillingInvoice,
	type BillingInvoiceProps,
} from '@domain/entities/billing-invoice.entity.ts';
import {
	PaymentTransaction,
	type PaymentTransactionProps,
} from '@domain/entities/payment-transaction.entity.ts';
import {
	CustomerUnauthorizedError,
	InvoiceNotFoundError,
	InvoicePdfNotReadyError,
	InvoiceUnavailableError,
	InvoiceVoidedError,
} from '@domain/errors/payment.errors.ts';
import { TransactionNotFoundError } from '@domain/errors/transaction.errors.ts';
import type { IBillingInvoiceRepository } from '@domain/repositories/billing-invoice.repository.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import {
	INVOICE_PDF_FILE_EXTENSION,
	INVOICE_PDF_FILE_PREFIX,
	INVOICE_STATUS,
	INVOICE_URL_EXPIRATION_SECONDS,
	PAYMENT_STATUS,
} from '@shared/constants/index.ts';

describe('GetCustomerInvoiceUseCase', () => {
	let mockTransactionRepo: jest.Mocked<IPaymentTransactionRepository>;
	let mockInvoiceRepo: jest.Mocked<IBillingInvoiceRepository>;
	let mockStorageService: jest.Mocked<IStorageService>;
	let useCase: GetCustomerInvoiceUseCase;

	const customerId = '10101010-1010-4010-a010-101010101010';
	const transactionId = '8e329a17-6421-4f3a-bfda-90e94bb10022';
	const restaurantId = '2ba55e12-4211-4f2a-bada-80e83bb09911';
	const orderId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
	const invoiceNumber = 'INV-20261111-1042';
	const invoicePdfKey = `spotq-order-invoices/${orderId}/2026/11/${invoiceNumber}.pdf`;

	const createMockTransaction = (overrides?: Partial<PaymentTransactionProps>) =>
		new PaymentTransaction({
			id: transactionId,
			restaurantId,
			customerId,
			orderId,
			razorpayOrderId: 'order_EK98a123cd45',
			razorpayPaymentId: 'pay_Oqk1028X9123',
			amountPaise: 125000,
			currency: 'INR',
			status: PAYMENT_STATUS.CAPTURED,
			createdAt: new Date('2026-11-11T10:00:00.000Z'),
			updatedAt: new Date('2026-11-11T10:01:00.000Z'),
			...overrides,
		});

	const createMockInvoice = (overrides?: Partial<BillingInvoiceProps>) =>
		new BillingInvoice({
			id: 'inv-uuid-001',
			restaurantId,
			paymentTransactionId: transactionId,
			invoiceNumber,
			amountPaise: 125000,
			currency: 'INR',
			status: INVOICE_STATUS.PAID,
			invoicePdfKey,
			pdfGeneratedAt: new Date('2026-11-11T10:02:00.000Z'),
			createdAt: new Date('2026-11-11T10:02:00.000Z'),
			updatedAt: new Date('2026-11-11T10:02:00.000Z'),
			...overrides,
		});

	beforeEach(() => {
		mockTransactionRepo = {
			findById: jest.fn(),
			findByOrderId: jest.fn(),
			findByCustomerOrderId: jest.fn(),
			findByPaymentId: jest.fn(),
			findCapturedByOrderId: jest.fn(),
			findPendingByRestaurantAndPlan: jest.fn(),
			findPendingRenewalBySubscriptionAndPlan: jest.fn(),
			create: jest.fn(),
			findRefundByPaymentTransactionId: jest.fn(),
			createRenewalWithInvoice: jest.fn(),
			captureOrderPaymentWithOutbox: jest.fn(),
			failOrderPaymentWithOutbox: jest.fn(),
			processOrderRefund: jest.fn(),
			syncRefundFromWebhook: jest.fn(),
			markSuccess: jest.fn(),
			markFailed: jest.fn(),
			resetToCreated: jest.fn(),
		};

		mockInvoiceRepo = {
			findById: jest.fn(),
			findByInvoiceNumber: jest.fn(),
			findByPaymentTransactionId: jest.fn(),
			findByRestaurantId: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			updatePdfKey: jest.fn(),
			delete: jest.fn(),
		};

		mockStorageService = {
			uploadFile: jest.fn(),
			fileExists: jest.fn(),
			generatePresignedDownloadUrl: jest.fn(),
		};

		useCase = new GetCustomerInvoiceUseCase(
			mockTransactionRepo,
			mockInvoiceRepo,
			mockStorageService,
		);
	});

	it('should throw CustomerUnauthorizedError when customerId is empty', async () => {
		await expect(useCase.execute({ transactionId, customerId: '   ' })).rejects.toThrow(
			CustomerUnauthorizedError,
		);
		expect(mockTransactionRepo.findById).not.toHaveBeenCalled();
	});

	it('should throw TransactionNotFoundError when transaction does not exist', async () => {
		mockTransactionRepo.findById.mockResolvedValueOnce(null);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			TransactionNotFoundError,
		);
	});

	it('should throw CustomerUnauthorizedError when transaction belongs to another customer', async () => {
		mockTransactionRepo.findById.mockResolvedValueOnce(
			createMockTransaction({ customerId: 'other-customer-id' }),
		);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			CustomerUnauthorizedError,
		);
	});

	it('should throw CustomerUnauthorizedError when transaction has no customerId', async () => {
		mockTransactionRepo.findById.mockResolvedValueOnce(createMockTransaction({ customerId: null }));

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			CustomerUnauthorizedError,
		);
	});

	it.each([PAYMENT_STATUS.CREATED, PAYMENT_STATUS.FAILED])(
		'should throw InvoiceUnavailableError when transaction status is %s',
		async (status) => {
			mockTransactionRepo.findById.mockResolvedValueOnce(createMockTransaction({ status }));

			await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
				InvoiceUnavailableError,
			);
			expect(mockInvoiceRepo.findByPaymentTransactionId).not.toHaveBeenCalled();
		},
	);

	it('should throw InvoiceVoidedError when transaction is REFUNDED', async () => {
		mockTransactionRepo.findById.mockResolvedValueOnce(
			createMockTransaction({ status: PAYMENT_STATUS.REFUNDED }),
		);
		mockInvoiceRepo.findByPaymentTransactionId.mockResolvedValueOnce(
			createMockInvoice({ status: INVOICE_STATUS.VOID, invoicePdfKey: null }),
		);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			InvoiceVoidedError,
		);
	});

	it('should throw InvoiceNotFoundError when billing invoice does not exist for captured transaction', async () => {
		mockTransactionRepo.findById.mockResolvedValueOnce(createMockTransaction());
		mockInvoiceRepo.findByPaymentTransactionId.mockResolvedValueOnce(null);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			InvoiceNotFoundError,
		);
	});

	it('should throw InvoiceVoidedError when billing invoice status is VOID', async () => {
		mockTransactionRepo.findById.mockResolvedValueOnce(createMockTransaction());
		mockInvoiceRepo.findByPaymentTransactionId.mockResolvedValueOnce(
			createMockInvoice({ status: INVOICE_STATUS.VOID }),
		);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			InvoiceVoidedError,
		);
	});

	it('should throw InvoicePdfNotReadyError when invoicePdfKey is null', async () => {
		mockTransactionRepo.findById.mockResolvedValueOnce(createMockTransaction());
		mockInvoiceRepo.findByPaymentTransactionId.mockResolvedValueOnce(
			createMockInvoice({ invoicePdfKey: null }),
		);

		await expect(useCase.execute({ transactionId, customerId })).rejects.toThrow(
			InvoicePdfNotReadyError,
		);
		expect(mockStorageService.generatePresignedDownloadUrl).not.toHaveBeenCalled();
	});

	it('should generate presigned download URL and return invoice metadata for captured transaction', async () => {
		const signedUrl = 'https://spotq-order-invoices.s3.ap-south-1.amazonaws.com/signed.pdf';
		mockTransactionRepo.findById.mockResolvedValueOnce(createMockTransaction());
		mockInvoiceRepo.findByPaymentTransactionId.mockResolvedValueOnce(createMockInvoice());
		mockStorageService.generatePresignedDownloadUrl.mockResolvedValueOnce({
			downloadUrl: signedUrl,
			expiresInSeconds: INVOICE_URL_EXPIRATION_SECONDS,
		});

		const result = await useCase.execute({ transactionId, customerId });

		expect(mockInvoiceRepo.findByPaymentTransactionId).toHaveBeenCalledWith(transactionId);
		expect(mockStorageService.generatePresignedDownloadUrl).toHaveBeenCalledWith({
			key: invoicePdfKey,
			expiresInSeconds: INVOICE_URL_EXPIRATION_SECONDS,
			fileName: `${INVOICE_PDF_FILE_PREFIX}${invoiceNumber}${INVOICE_PDF_FILE_EXTENSION}`,
		});
		expect(result).toEqual({
			downloadUrl: signedUrl,
			expiresInSeconds: INVOICE_URL_EXPIRATION_SECONDS,
			invoiceNumber,
		});
	});
});
