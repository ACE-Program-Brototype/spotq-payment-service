import { OrderRefundMapper } from '@application/mappers/order-refund.mapper.ts';
import { PaymentRefund } from '@domain/entities/payment-refund.entity.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import { DEFAULT_REFUND_REASON, REFUND_STATUS } from '@shared/constants/index.ts';

describe('OrderRefundMapper', () => {
	it('should map domain transaction and refund entity to ProcessOrderRefundOutput', () => {
		const processedDate = new Date('2026-11-04T12:00:00.000Z');

		const tx = new PaymentTransaction({
			id: 'tx-refund-test-1',
			restaurantId: 'rest-123',
			orderId: 'order-123',
			customerId: 'cust-123',
			razorpayOrderId: 'order_rzp_123',
			razorpayPaymentId: 'pay_rzp_123',
			amountPaise: 86800,
			currency: 'INR',
			status: 'REFUNDED',
		});

		const refund = new PaymentRefund({
			id: 'rfnd-record-1',
			paymentTransactionId: tx.id,
			razorpayRefundId: 'rfnd_OEd92m8F05s9jKa',
			amountPaise: 86800,
			currency: 'INR',
			status: REFUND_STATUS.PROCESSED,
			reason: DEFAULT_REFUND_REASON,
			processedAt: processedDate,
		});

		const output = OrderRefundMapper.toResponse(tx, refund);

		expect(output).toEqual({
			refundId: 'rfnd_OEd92m8F05s9jKa',
			transactionId: 'tx-refund-test-1',
			orderId: 'order-123',
			amountPaise: 86800,
			currency: 'INR',
			status: REFUND_STATUS.PROCESSED,
			processedAt: processedDate.toISOString(),
		});
	});

	it('should default orderId to empty string when transaction orderId is null', () => {
		const tx = new PaymentTransaction({
			id: 'tx-no-order',
			restaurantId: 'rest-123',
			razorpayOrderId: 'order_rzp_123',
			amountPaise: 40000,
			currency: 'INR',
			status: 'REFUNDED',
		});

		const refund = new PaymentRefund({
			id: 'rfnd-record-2',
			paymentTransactionId: tx.id,
			razorpayRefundId: 'rfnd_123',
			amountPaise: 40000,
			currency: 'INR',
			status: 'PROCESSED',
		});

		const output = OrderRefundMapper.toResponse(tx, refund);
		expect(output.orderId).toBe('');
	});
});
