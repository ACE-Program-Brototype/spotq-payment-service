import { PaymentRefund } from '@domain/entities/payment-refund.entity.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import { InvalidPaymentStateTransitionError } from '@domain/errors/payment.errors.ts';

describe('PaymentRefund Entity', () => {
	it('should instantiate PaymentRefund correctly with all properties', () => {
		const now = new Date();
		const refund = new PaymentRefund({
			id: 'refund-123',
			paymentTransactionId: 'tx-123',
			razorpayRefundId: 'rfnd_ABC123',
			amountPaise: 50000,
			currency: 'INR',
			status: 'PROCESSED',
			reason: 'CUSTOMER_CANCELLED',
			arn: '123456789012',
			paymentMethod: 'ONLINE',
			destination: 'upi',
			createdAt: now,
			processedAt: now,
		});

		expect(refund.id).toBe('refund-123');
		expect(refund.paymentTransactionId).toBe('tx-123');
		expect(refund.razorpayRefundId).toBe('rfnd_ABC123');
		expect(refund.amountPaise).toBe(50000);
		expect(refund.amountInRupees).toBe(500);
		expect(refund.currency).toBe('INR');
		expect(refund.status).toBe('PROCESSED');
		expect(refund.reason).toBe('CUSTOMER_CANCELLED');
		expect(refund.arn).toBe('123456789012');
		expect(refund.paymentMethod).toBe('ONLINE');
		expect(refund.destination).toBe('upi');
		expect(refund.createdAt).toBe(now);
		expect(refund.processedAt).toBe(now);
	});

	it('should serialize PaymentRefund to JSON correctly', () => {
		const now = new Date();
		const refund = new PaymentRefund({
			id: 'refund-123',
			paymentTransactionId: 'tx-123',
			razorpayRefundId: 'rfnd_ABC123',
			amountPaise: 35000,
			currency: 'INR',
			status: 'PROCESSED',
			createdAt: now,
			processedAt: now,
		});

		const json = refund.toJSON();
		expect(json).toEqual({
			id: 'refund-123',
			paymentTransactionId: 'tx-123',
			razorpayRefundId: 'rfnd_ABC123',
			amountPaise: 35000,
			amountInRupees: 350,
			currency: 'INR',
			status: 'PROCESSED',
			reason: null,
			arn: null,
			paymentMethod: null,
			destination: null,
			createdAt: now,
			processedAt: now,
		});
	});

	describe('PaymentTransaction markRefunded state transition', () => {
		it('should transition to REFUNDED from CAPTURED', () => {
			const tx = new PaymentTransaction({
				id: 'tx-1',
				restaurantId: 'rest-1',
				razorpayOrderId: 'order_1',
				amountPaise: 50000,
				currency: 'INR',
				status: 'CAPTURED',
			});

			tx.markRefunded();
			expect(tx.status).toBe('REFUNDED');
		});

		it('should transition to REFUNDED from SUCCESS', () => {
			const tx = new PaymentTransaction({
				id: 'tx-2',
				restaurantId: 'rest-1',
				razorpayOrderId: 'order_2',
				amountPaise: 50000,
				currency: 'INR',
				status: 'SUCCESS',
			});

			tx.markRefunded();
			expect(tx.status).toBe('REFUNDED');
		});

		it('should throw InvalidPaymentStateTransitionError when transitioning from CREATED', () => {
			const tx = new PaymentTransaction({
				id: 'tx-3',
				restaurantId: 'rest-1',
				razorpayOrderId: 'order_3',
				amountPaise: 50000,
				currency: 'INR',
				status: 'CREATED',
			});

			expect(() => tx.markRefunded()).toThrow(InvalidPaymentStateTransitionError);
		});

		it('should throw InvalidPaymentStateTransitionError when transitioning from FAILED', () => {
			const tx = new PaymentTransaction({
				id: 'tx-4',
				restaurantId: 'rest-1',
				razorpayOrderId: 'order_4',
				amountPaise: 50000,
				currency: 'INR',
				status: 'FAILED',
			});

			expect(() => tx.markRefunded()).toThrow(InvalidPaymentStateTransitionError);
		});
	});
});
