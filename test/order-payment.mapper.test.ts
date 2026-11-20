import { OrderPaymentMapper } from '@application/mappers/index.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import { PAYMENT_STATUS } from '@shared/constants/index.ts';

describe('OrderPaymentMapper', () => {
	const createSampleTx = (
		overrides?: Partial<ConstructorParameters<typeof PaymentTransaction>[0]>,
	) =>
		new PaymentTransaction({
			id: 'pay_tx_123',
			restaurantId: 'rest_001',
			orderId: 'ord_456',
			customerId: 'cust_789',
			razorpayOrderId: 'order_rzp_999',
			razorpayPaymentId: 'pay_rzp_888',
			amountPaise: 49900,
			currency: 'INR',
			status: PAYMENT_STATUS.CAPTURED,
			createdAt: new Date('2026-11-01T10:00:00.000Z'),
			updatedAt: new Date('2026-11-01T10:05:00.000Z'),
			...overrides,
		});

	describe('toCreateResponse', () => {
		it('should map domain transaction to CreateOrderPaymentOutput', () => {
			const tx = createSampleTx();
			const output = OrderPaymentMapper.toCreateResponse(tx, 'rzp_test_key');

			expect(output).toEqual({
				paymentId: 'pay_tx_123',
				orderId: 'ord_456',
				razorpayOrderId: 'order_rzp_999',
				amountPaise: 49900,
				currency: 'INR',
				keyId: 'rzp_test_key',
			});
		});

		it('should default orderId to empty string when transaction orderId is null', () => {
			const tx = createSampleTx({ orderId: null });
			const output = OrderPaymentMapper.toCreateResponse(tx, 'rzp_test_key');

			expect(output.orderId).toBe('');
		});
	});

	describe('toStatusResponse', () => {
		it('should map domain transaction to GetOrderPaymentStatusOutput', () => {
			const tx = createSampleTx();
			const output = OrderPaymentMapper.toStatusResponse(tx);

			expect(output).toEqual({
				orderId: 'ord_456',
				paymentId: 'pay_tx_123',
				gatewayPaymentId: 'pay_rzp_888',
				razorpayOrderId: 'order_rzp_999',
				amountPaise: 49900,
				currency: 'INR',
				status: PAYMENT_STATUS.CAPTURED,
				method: 'ONLINE',
				createdAt: '2026-11-01T10:00:00.000Z',
			});
		});
	});

	describe('toVerifyResponse', () => {
		it('should map domain transaction to VerifyOrderPaymentOutput', () => {
			const tx = createSampleTx();
			const output = OrderPaymentMapper.toVerifyResponse(tx);

			expect(output).toEqual({
				paymentId: 'pay_tx_123',
				orderId: 'ord_456',
				gatewayPaymentId: 'pay_rzp_888',
				status: PAYMENT_STATUS.CAPTURED,
				verifiedAt: '2026-11-01T10:05:00.000Z',
			});
		});
	});
});
