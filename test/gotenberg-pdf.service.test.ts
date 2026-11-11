import axios, { AxiosError } from 'axios';
import type { OrderInvoiceDataDTO } from '../src/application/dtos/order-payment-invoice-event.dto.ts';
import { PdfGenerationError } from '../src/infrastructure/errors/index.ts';
import { GotenbergPdfService } from '../src/infrastructure/pdf/gotenberg-pdf.service.ts';

jest.mock('axios');

describe('GotenbergPdfService', () => {
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

	let service: GotenbergPdfService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new GotenbergPdfService();
	});

	it('should successfully generate PDF via axios post', async () => {
		const expectedPdf = Buffer.from('%PDF-1.4 test-pdf-content');
		(axios.post as jest.Mock).mockResolvedValue({
			data: expectedPdf,
		});

		const result = await service.generateInvoicePdf(mockOrderData);

		expect(axios.post).toHaveBeenCalledTimes(1);
		const [endpoint, formData, options] = (axios.post as jest.Mock).mock.calls[0];
		expect(endpoint).toBe('http://localhost:3008/forms/chromium/convert/html');
		expect(formData).toBeInstanceOf(FormData);
		expect(options).toEqual({ responseType: 'arraybuffer' });
		expect(result).toEqual(expectedPdf);
	});

	it('should throw PdfGenerationError when Gotenberg returns 4xx/5xx HTTP error', async () => {
		const axiosError = new AxiosError('Request failed with status code 400');
		axiosError.response = {
			status: 400,
			statusText: 'Bad Request',
			data: Buffer.from('Chromium parsing failed'),
			headers: {},
			config: {} as unknown as AxiosError['config'],
		} as unknown as AxiosError['response'];
		(axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
		(axios.post as jest.Mock).mockRejectedValue(axiosError);

		await expect(service.generateInvoicePdf(mockOrderData)).rejects.toThrow(PdfGenerationError);
	});

	it('should rethrow network or connection errors when Gotenberg is unreachable', async () => {
		const networkError = new Error('connect ECONNREFUSED 127.0.0.1:3008');
		(axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
		(axios.post as jest.Mock).mockRejectedValue(networkError);

		await expect(service.generateInvoicePdf(mockOrderData)).rejects.toThrow(
			'connect ECONNREFUSED 127.0.0.1:3008',
		);
	});
});
