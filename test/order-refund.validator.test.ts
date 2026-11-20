import {
	processOrderRefundHeadersSchema,
	processOrderRefundSchema,
} from '@presentation/validators/order-payment.validators.ts';

describe('processOrderRefundSchema', () => {
	const validOrderId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

	it('should accept valid refund payload with all fields', () => {
		const result = processOrderRefundSchema.safeParse({
			orderId: validOrderId,
			amountPaise: 86800,
			reason: 'CUSTOMER_CANCELLED',
			notes: 'Customer cancelled before kitchen acceptance',
		});

		expect(result.success).toBe(true);
	});

	it('should accept valid refund payload with only orderId', () => {
		const result = processOrderRefundSchema.safeParse({
			orderId: validOrderId,
		});

		expect(result.success).toBe(true);
	});

	it('should reject invalid UUID for orderId', () => {
		const result = processOrderRefundSchema.safeParse({
			orderId: 'not-a-uuid',
		});

		expect(result.success).toBe(false);
	});

	it('should reject non-positive amountPaise', () => {
		const result = processOrderRefundSchema.safeParse({
			orderId: validOrderId,
			amountPaise: -100,
		});

		expect(result.success).toBe(false);
	});

	it('should reject floating point amountPaise', () => {
		const result = processOrderRefundSchema.safeParse({
			orderId: validOrderId,
			amountPaise: 100.5,
		});

		expect(result.success).toBe(false);
	});
});

describe('processOrderRefundHeadersSchema', () => {
	it('should accept headers with x-idempotency-key', () => {
		const result = processOrderRefundHeadersSchema.safeParse({
			'x-idempotency-key': 'x-cancel-order-123',
			'content-type': 'application/json',
		});

		expect(result.success).toBe(true);
	});

	it('should reject headers when x-idempotency-key is missing', () => {
		const result = processOrderRefundHeadersSchema.safeParse({
			'content-type': 'application/json',
		});

		expect(result.success).toBe(false);
	});

	it('should reject empty string for x-idempotency-key', () => {
		const result = processOrderRefundHeadersSchema.safeParse({
			'x-idempotency-key': '',
		});

		expect(result.success).toBe(false);
	});
});
