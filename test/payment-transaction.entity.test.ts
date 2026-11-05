import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import {
	CustomerUnauthorizedError,
	InvalidPaymentStateTransitionError,
	PaymentNotRetryableError,
	PaymentOrderNotFoundError,
} from '@domain/errors/payment.errors.ts';

describe('PaymentTransaction Entity', () => {
	const createTx = (customerId?: string | null) =>
		new PaymentTransaction({
			id: 'pay-123',
			restaurantId: 'rest-123',
			orderId: 'ord-123',
			customerId: customerId ?? null,
			razorpayOrderId: 'rzp_order_123',
			amountPaise: 5000,
			currency: 'INR',
			status: 'CREATED',
		});

	describe('isOwnedBy', () => {
		it('should return true when transaction has no customerId (unassigned / guest)', () => {
			const tx = createTx(null);
			expect(tx.isOwnedBy('any-customer')).toBe(true);
		});

		it('should return true when customerId matches', () => {
			const tx = createTx('cust-100');
			expect(tx.isOwnedBy('cust-100')).toBe(true);
		});

		it('should return false when customerId does not match', () => {
			const tx = createTx('cust-100');
			expect(tx.isOwnedBy('cust-999')).toBe(false);
		});
	});

	describe('assertOwnership', () => {
		it('should not throw when caller matches customerId', () => {
			const tx = createTx('cust-100');
			expect(() => tx.assertOwnership('cust-100')).not.toThrow();
		});

		it('should throw CustomerUnauthorizedError when customerId is present but caller is undefined/empty', () => {
			const tx = createTx('cust-100');
			expect(() => tx.assertOwnership(undefined)).toThrow(CustomerUnauthorizedError);
			expect(() => tx.assertOwnership('')).toThrow(CustomerUnauthorizedError);
		});

		it('should not throw when transaction has no customerId and caller is undefined', () => {
			const tx = createTx(null);
			expect(() => tx.assertOwnership(undefined)).not.toThrow();
		});

		it('should throw CustomerUnauthorizedError when caller does not match customerId', () => {
			const tx = createTx('cust-100');
			expect(() => tx.assertOwnership('cust-999')).toThrow(CustomerUnauthorizedError);
		});
	});

	describe('belongsToOrder', () => {
		it('should return true when orderId matches', () => {
			const tx = createTx('cust-100');
			expect(tx.belongsToOrder('ord-123')).toBe(true);
		});

		it('should return false when orderId does not match', () => {
			const tx = createTx('cust-100');
			expect(tx.belongsToOrder('different-ord-999')).toBe(false);
		});
	});

	describe('assertBelongsToOrder', () => {
		it('should not throw when orderId matches', () => {
			const tx = createTx('cust-100');
			expect(() => tx.assertBelongsToOrder('ord-123')).not.toThrow();
		});

		it('should throw PaymentOrderNotFoundError when orderId does not match', () => {
			const tx = createTx('cust-100');
			expect(() => tx.assertBelongsToOrder('different-ord-999')).toThrow(PaymentOrderNotFoundError);
		});
	});

	describe('paymentMethod', () => {
		it('should return method from metadata when present', () => {
			const tx = new PaymentTransaction({
				id: 'pay-123',
				restaurantId: 'rest-123',
				orderId: 'ord-123',
				razorpayOrderId: 'rzp_order_123',
				amountPaise: 5000,
				currency: 'INR',
				status: 'CAPTURED',
				metadata: { method: 'netbanking' },
			});
			expect(tx.paymentMethod).toBe('netbanking');
		});

		it('should fallback to DEFAULT_PAYMENT_METHOD (ONLINE) when status is CAPTURED and metadata has no method', () => {
			const tx = new PaymentTransaction({
				id: 'pay-123',
				restaurantId: 'rest-123',
				orderId: 'ord-123',
				razorpayOrderId: 'rzp_order_123',
				amountPaise: 5000,
				currency: 'INR',
				status: 'CAPTURED',
			});
			expect(tx.paymentMethod).toBe('ONLINE');
		});

		it('should return null when status is not CAPTURED and metadata has no method', () => {
			const tx = new PaymentTransaction({
				id: 'pay-123',
				restaurantId: 'rest-123',
				orderId: 'ord-123',
				razorpayOrderId: 'rzp_order_123',
				amountPaise: 5000,
				currency: 'INR',
				status: 'CREATED',
			});
			expect(tx.paymentMethod).toBeNull();
		});
	});

	describe('capture', () => {
		it('should update status to CAPTURED and set payment details', () => {
			const tx = createTx('cust-100');
			tx.capture({
				paymentId: 'pay_999',
				signature: 'sig_999',
				metadata: { method: 'card' },
			});

			expect(tx.status).toBe('CAPTURED');
			expect(tx.razorpayPaymentId).toBe('pay_999');
			expect(tx.razorpaySignature).toBe('sig_999');
			expect(tx.paymentMethod).toBe('card');
			expect(tx.updatedAt).toBeInstanceOf(Date);
		});

		it('should be idempotent when already CAPTURED', () => {
			const tx = new PaymentTransaction({
				id: 'pay-123',
				restaurantId: 'rest-123',
				orderId: 'ord-123',
				razorpayOrderId: 'rzp_order_123',
				razorpayPaymentId: 'pay_original',
				amountPaise: 5000,
				currency: 'INR',
				status: 'CAPTURED',
			});

			tx.capture({ paymentId: 'pay_new' });
			expect(tx.razorpayPaymentId).toBe('pay_original');
			expect(tx.status).toBe('CAPTURED');
		});

		it('should throw InvalidPaymentStateTransitionError when attempting to capture a FAILED transaction', () => {
			const tx = new PaymentTransaction({
				id: 'pay-123',
				restaurantId: 'rest-123',
				orderId: 'ord-123',
				razorpayOrderId: 'rzp_order_123',
				amountPaise: 5000,
				currency: 'INR',
				status: 'FAILED',
				failureReason: 'Gateway payment expired',
			});

			expect(() => tx.capture({ paymentId: 'pay_new' })).toThrow(
				InvalidPaymentStateTransitionError,
			);
		});
	});

	describe('markFailed', () => {
		it('should transition status to FAILED and record failure reason', () => {
			const tx = createTx('cust-100');
			tx.markFailed('Payment timeout on gateway');

			expect(tx.status).toBe('FAILED');
			expect(tx.failureReason).toBe('Payment timeout on gateway');
			expect(tx.updatedAt).toBeInstanceOf(Date);
		});

		it('should not overwrite status when transaction is already CAPTURED', () => {
			const tx = new PaymentTransaction({
				id: 'pay-123',
				restaurantId: 'rest-123',
				orderId: 'ord-123',
				razorpayOrderId: 'rzp_order_123',
				amountPaise: 5000,
				currency: 'INR',
				status: 'CAPTURED',
			});

			tx.markFailed('Failure arrived late');
			expect(tx.status).toBe('CAPTURED');
			expect(tx.failureReason).toBeNull();
		});
	});

	describe('resetToCreated', () => {
		it('should reset FAILED transaction status to CREATED and clear failureReason', () => {
			const tx = new PaymentTransaction({
				id: 'pay-123',
				restaurantId: 'rest-123',
				orderId: 'ord-123',
				razorpayOrderId: 'rzp_order_123',
				amountPaise: 5000,
				currency: 'INR',
				status: 'FAILED',
				failureReason: 'Card declined',
			});

			tx.resetToCreated();

			expect(tx.status).toBe('CREATED');
			expect(tx.failureReason).toBeNull();
			expect(tx.updatedAt).toBeInstanceOf(Date);
		});

		it('should throw PaymentNotRetryableError when transaction status is not FAILED', () => {
			const capturedTx = new PaymentTransaction({
				id: 'pay-123',
				restaurantId: 'rest-123',
				orderId: 'ord-123',
				razorpayOrderId: 'rzp_order_123',
				amountPaise: 5000,
				currency: 'INR',
				status: 'CAPTURED',
			});

			expect(() => capturedTx.resetToCreated()).toThrow(PaymentNotRetryableError);
		});
	});
});
