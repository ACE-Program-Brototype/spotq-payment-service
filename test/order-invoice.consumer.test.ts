import { OrderInvoiceConsumer } from '../src/infrastructure/messaging/order-invoice.consumer.ts';

describe('OrderInvoiceConsumer', () => {
	let mockRabbitMQService: any;
	let mockUseCase: any;
	let consumer: OrderInvoiceConsumer;

	const validPayload = {
		eventId: 'acf95378-c443-43f3-9d04-2f6f93d2079e',
		eventType: 'order.payment.invoice',
		aggregateId: '25679960-2f90-44f0-bb04-59e10a2a1fad',
		timestamp: '2026-11-04T19:44:10.429Z',
		orderData: {
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
					quantity: 3,
					unitPrice: 12,
					totalPrice: 36,
					addons: [],
				},
			],
			createdAt: '2026-11-04T19:41:36.773Z',
			confirmedAt: '2026-11-04T19:44:10.429Z',
		},
	};

	beforeEach(() => {
		mockRabbitMQService = {
			consumeFromQueue: jest.fn(),
		};
		mockUseCase = {
			execute: jest.fn().mockResolvedValue({}),
		};
		consumer = new OrderInvoiceConsumer(mockRabbitMQService, mockUseCase);
	});

	it('should start consumer and subscribe to payment-events queue', async () => {
		await consumer.start();
		expect(mockRabbitMQService.consumeFromQueue).toHaveBeenCalledWith(
			'payment-events',
			expect.any(Function),
		);
	});

	it('should process valid order.payment.invoice event when running', async () => {
		await consumer.start();
		await consumer.handleMessage(validPayload);
		expect(mockUseCase.execute).toHaveBeenCalledWith(validPayload.orderData);
	});

	it('should ignore events when consumer is stopped', async () => {
		await consumer.start();
		await consumer.stop();
		await consumer.handleMessage(validPayload);
		expect(mockUseCase.execute).not.toHaveBeenCalled();
	});

	it('should ignore events with different eventType', async () => {
		await consumer.start();
		await consumer.handleMessage({
			eventType: 'other.event',
			orderData: {},
		});
		expect(mockUseCase.execute).not.toHaveBeenCalled();
	});

	it('should ignore malformed event without crashing', async () => {
		await consumer.start();
		await consumer.handleMessage({
			eventType: 'order.payment.invoice',
			orderData: { invalid: true },
		});
		expect(mockUseCase.execute).not.toHaveBeenCalled();
	});
});
