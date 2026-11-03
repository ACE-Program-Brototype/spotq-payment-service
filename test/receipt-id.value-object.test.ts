import { ReceiptId } from '@domain/value-objects/index.ts';
import { PAYMENT_RECEIPT } from '@shared/constants/index.ts';

describe('ReceiptId Value Object', () => {
	describe('forOrder', () => {
		it('should format order receipt with ord_ prefix and stripped hyphens', () => {
			const orderId = 'a1b2-c3d4-e5f6-7890';
			const receiptId = ReceiptId.forOrder(orderId);

			expect(receiptId).toBe('ord_a1b2c3d4e5f67890');
			expect(receiptId.startsWith(PAYMENT_RECEIPT.ORDER_PREFIX)).toBe(true);
		});

		it('should truncate orderId to MAX_ID_LENGTH after stripping hyphens', () => {
			const veryLongOrderId = '12345678-9012-3456-7890-12345678901234567890';
			const receiptId = ReceiptId.forOrder(veryLongOrderId);

			const expectedSuffix = veryLongOrderId
				.replace(/-/g, '')
				.slice(0, PAYMENT_RECEIPT.MAX_ID_LENGTH);
			expect(receiptId).toBe(`${PAYMENT_RECEIPT.ORDER_PREFIX}${expectedSuffix}`);
			expect(receiptId.length).toBeLessThanOrEqual(
				PAYMENT_RECEIPT.ORDER_PREFIX.length + PAYMENT_RECEIPT.MAX_ID_LENGTH,
			);
		});
	});

	describe('forSubscription', () => {
		it('should format subscription receipt with rcpt_ prefix, sliced restaurantId and timestamp', () => {
			const restaurantId = 'rest-1234-abcd-ef01';
			const fixedTimestamp = 1700000000000;
			const receiptId = ReceiptId.forSubscription(restaurantId, fixedTimestamp);

			expect(receiptId).toBe('rcpt_rest1234ab_1700000000000');
			expect(receiptId.startsWith(PAYMENT_RECEIPT.SUBSCRIPTION_PREFIX)).toBe(true);
		});

		it('should default timestamp to current time when omitted', () => {
			const before = Date.now();
			const receiptId = ReceiptId.forSubscription('rest-999');
			const after = Date.now();

			const timestampPart = Number(receiptId.split('_')[2]);
			expect(timestampPart).toBeGreaterThanOrEqual(before);
			expect(timestampPart).toBeLessThanOrEqual(after);
		});
	});

	describe('of and toString', () => {
		it('should instantiate and return value via value property and toString', () => {
			const vo = ReceiptId.of('custom_receipt_123');

			expect(vo.value).toBe('custom_receipt_123');
			expect(vo.toString()).toBe('custom_receipt_123');
		});
	});
});
