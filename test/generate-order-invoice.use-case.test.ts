import type { OrderInvoiceDataDTO } from '../src/application/dtos/order-payment-invoice-event.dto.ts';
import { GenerateOrderInvoiceUseCase } from '../src/application/use-cases/invoice/generate-order-invoice.use-case.ts';
import { BillingInvoice } from '../src/domain/entities/billing-invoice.entity.ts';

describe('GenerateOrderInvoiceUseCase', () => {
	const mockOrderData: OrderInvoiceDataDTO = {
		orderId: '25679960-2f90-44f0-bb04-59e10a2a1fad',
		orderNumber: 'ORD-MW2IVUYM-40CDEC',
		paymentId: '60cc4d22-8e6b-46d9-a427-8175ffa2e1b4',
		restaurantId: '7837b94b-d0c4-4e94-9eb9-81a1d4116701',
		restaurantName: 'hai restaurant',
		customerId: '911588f8-9ae1-439f-aeeb-c31b67c2b8a8',
		customerName: 'Allu Ameen',
		customerPhone: '+91 823727822',
		orderingMode: 'SELF_ORDER',
		tableNumber: null,
		paymentMode: 'ONLINE',
		paymentStatus: 'PAID',
		orderStatus: 'CONFIRMED',
		currency: 'INR',
		financials: {
			subtotal: 36,
			taxAmount: 1.8,
			platformFee: 0,
			discountAmount: 0,
			grandTotal: 37.8,
			amountPaise: 3780,
		},
		items: [
			{
				menuItemId: '393400c7-2fef-44a8-8b30-2cb2b0d78154',
				itemName: 'Biriyani',
				variantId: null,
				variantName: null,
				quantity: 3,
				unitPrice: 12,
				totalPrice: 36,
				specialInstructions: null,
				addons: [],
			},
		],
		createdAt: '2026-11-04T19:41:36.773Z',
		confirmedAt: '2026-11-04T19:44:10.429Z',
	};

	let mockInvoiceRepo: any;
	let mockPdfService: any;
	let mockStorageService: any;
	let mockLogger: any;
	let useCase: GenerateOrderInvoiceUseCase;

	beforeEach(() => {
		mockInvoiceRepo = {
			findByPaymentTransactionId: jest.fn(),
			create: jest.fn(),
			updatePdfKey: jest.fn(),
		};

		mockPdfService = {
			generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 Mock PDF')),
		};

		mockStorageService = {
			uploadFile: jest.fn().mockResolvedValue(undefined),
			fileExists: jest.fn().mockResolvedValue(false),
		};

		mockLogger = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
		};

		useCase = new GenerateOrderInvoiceUseCase(
			mockInvoiceRepo,
			mockPdfService,
			mockStorageService,
			mockLogger,
		);
	});

	it('should return existing invoice early if invoicePdfKey is already populated (idempotency)', async () => {
		const existingInvoice = new BillingInvoice({
			id: 'inv-uuid-1',
			restaurantId: mockOrderData.restaurantId,
			paymentTransactionId: mockOrderData.paymentId,
			invoiceNumber: 'INV-20261104-40CDEC',
			amountPaise: 3780,
			currency: 'INR',
			status: 'PAID',
			invoicePdfKey:
				'invoices/25679960-2f90-44f0-bb04-59e10a2a1fad/2026/11/INV-20261104-40CDEC.pdf',
			pdfGeneratedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		mockInvoiceRepo.findByPaymentTransactionId.mockResolvedValue(existingInvoice);

		const result = await useCase.execute(mockOrderData);

		expect(result).toBe(existingInvoice);
		expect(mockPdfService.generateInvoicePdf).not.toHaveBeenCalled();
		expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
		expect(mockInvoiceRepo.create).not.toHaveBeenCalled();
	});

	it('should generate PDF, upload to S3 partitioned by orderId, and update invoice if not yet generated', async () => {
		const createdInvoice = new BillingInvoice({
			id: 'inv-uuid-new',
			restaurantId: mockOrderData.restaurantId,
			paymentTransactionId: mockOrderData.paymentId,
			invoiceNumber: 'INV-20261104-MW2IVUYM40CDEC',
			amountPaise: 3780,
			currency: 'INR',
			status: 'PAID',
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		mockInvoiceRepo.findByPaymentTransactionId.mockResolvedValue(null);
		mockInvoiceRepo.create.mockResolvedValue(createdInvoice);
		mockInvoiceRepo.updatePdfKey.mockResolvedValue(
			new BillingInvoice({
				...createdInvoice['props'],
				invoicePdfKey: `invoices/${mockOrderData.orderId}/2026/11/INV-20261104-MW2IVUYM40CDEC.pdf`,
				pdfGeneratedAt: new Date(),
			}),
		);

		const result = await useCase.execute(mockOrderData);

		expect(mockInvoiceRepo.create).toHaveBeenCalled();
		expect(mockPdfService.generateInvoicePdf).toHaveBeenCalledWith(mockOrderData);
		expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
			expect.stringContaining(`spotq-order-invoices/${mockOrderData.orderId}/2026/11/`),
			expect.any(Buffer),
			'application/pdf',
		);
		expect(mockInvoiceRepo.updatePdfKey).toHaveBeenCalledWith(
			'inv-uuid-new',
			expect.stringContaining('.pdf'),
			expect.any(Date),
		);
		expect(result.invoicePdfKey).toBeTruthy();
	});
});
