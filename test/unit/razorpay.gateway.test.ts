import { PaymentGatewayUnavailableError } from '@domain/index.ts';
import { RazorpayGateway } from '@infrastructure/payment/razorpay.gateway.ts';

const mockOrdersCreate = jest.fn();
const mockPaymentsFetch = jest.fn();
const mockPaymentsRefund = jest.fn();

const mockRazorpayClient = {
	orders: {
		create: mockOrdersCreate,
	},
	payments: {
		fetch: mockPaymentsFetch,
		refund: mockPaymentsRefund,
	},
};

jest.mock('razorpay', () => {
	return jest.fn().mockImplementation(() => mockRazorpayClient);
});

describe('RazorpayGateway Circuit Breaker Integration (SCRUM-1259)', () => {
	let gateway: RazorpayGateway;

	beforeEach(async () => {
		mockOrdersCreate.mockReset();
		mockPaymentsFetch.mockReset();
		mockPaymentsRefund.mockReset();

		gateway = new RazorpayGateway();
		await gateway.initialize();
	});

	afterEach(() => {
		gateway.shutdown();
		jest.clearAllMocks();
	});

	describe('Basic Gateway Operations & Health Check', () => {
		it('should report healthy when initialized and circuit breakers are closed', () => {
			expect(gateway.isHealthy()).toBe(true);
		});

		it('should gracefully nullify breakers on shutdown without errors', () => {
			expect(gateway.isHealthy()).toBe(true);
			gateway.shutdown();
			expect(() => gateway.shutdown()).not.toThrow();
		});

		it('should successfully create an order through circuit breaker', async () => {
			mockOrdersCreate.mockResolvedValueOnce({
				id: 'order_test_123',
				amount: 50000,
				currency: 'INR',
				status: 'created',
				receipt: 'rcpt_001',
			});

			const result = await gateway.createOrder({
				amountInPaise: 50000,
				currency: 'INR',
				receiptId: 'rcpt_001',
			});

			expect(result).toEqual({
				orderId: 'order_test_123',
				amount: 50000,
				currency: 'INR',
				status: 'created',
				receipt: 'rcpt_001',
			});
			expect(mockOrdersCreate).toHaveBeenCalledTimes(1);
			expect(gateway.isHealthy()).toBe(true);
		});

		it('should successfully fetch payment details through circuit breaker', async () => {
			mockPaymentsFetch.mockResolvedValueOnce({
				id: 'pay_test_123',
				entity: 'payment',
				amount: 50000,
				currency: 'INR',
				status: 'captured',
				order_id: 'order_test_123',
				created_at: 1700000000,
			});

			const result = await gateway.getPaymentDetails('pay_test_123');

			expect(result.id).toBe('pay_test_123');
			expect(result.status).toBe('captured');
			expect(mockPaymentsFetch).toHaveBeenCalledTimes(1);
			expect(gateway.isHealthy()).toBe(true);
		});

		it('should successfully create a refund through circuit breaker', async () => {
			mockPaymentsRefund.mockResolvedValueOnce({
				id: 'rfnd_test_123',
				payment_id: 'pay_test_123',
				amount: 25000,
				currency: 'INR',
				status: 'processed',
				arn: 'ARN123456',
			});

			const result = await gateway.createRefund({
				paymentId: 'pay_test_123',
				amountInPaise: 25000,
			});

			expect(result).toEqual({
				refundId: 'rfnd_test_123',
				paymentId: 'pay_test_123',
				amount: 25000,
				currency: 'INR',
				status: 'processed',
				arn: 'ARN123456',
			});
			expect(mockPaymentsRefund).toHaveBeenCalledTimes(1);
			expect(gateway.isHealthy()).toBe(true);
		});
	});

	describe('AC 2: Exempt Client Errors (HTTP 4xx / Validation)', () => {
		it('should NOT count 400 Bad Request errors as circuit failures or trip the breaker', async () => {
			const badRequestError = Object.assign(new Error('Invalid parameters'), {
				statusCode: 400,
				error: { code: 'BAD_REQUEST_ERROR', description: 'Amount is invalid' },
			});
			mockOrdersCreate.mockRejectedValue(badRequestError);

			// Exceed volume threshold (3 requests) with client-side 400 errors
			for (let i = 0; i < 3; i++) {
				await expect(
					gateway.createOrder({
						amountInPaise: -1,
						currency: 'INR',
						receiptId: 'rcpt_bad',
					}),
				).rejects.toThrow('Invalid parameters');
			}

			// Circuit breaker must remain CLOSED and healthy
			expect(gateway.isHealthy()).toBe(true);
			expect(mockOrdersCreate).toHaveBeenCalledTimes(3);
		});

		it('should NOT trip the circuit breaker on 404 Not Found payment fetch errors', async () => {
			const notFoundError = Object.assign(new Error('Payment not found'), {
				statusCode: 404,
				error: { code: 'BAD_REQUEST_ERROR', description: 'Payment not found' },
			});
			mockPaymentsFetch.mockRejectedValue(notFoundError);

			for (let i = 0; i < 3; i++) {
				await expect(gateway.getPaymentDetails('pay_nonexistent')).rejects.toThrow(
					'Payment not found',
				);
			}

			expect(gateway.isHealthy()).toBe(true);
		});
	});

	describe('AC 1 & AC 4: Tripping to OPEN, Fast-Fail & Health Degradation', () => {
		it('should trip to OPEN on 500 server errors, fast-fail with PaymentGatewayUnavailableError, and report unhealthy', async () => {
			const serverError = Object.assign(new Error('Internal Razorpay Server Error'), {
				statusCode: 500,
				error: { code: 'GATEWAY_ERROR' },
			});
			mockOrdersCreate.mockRejectedValue(serverError);

			// Fire requests to meet volume threshold (2) and error threshold (100% > 50%)
			await expect(
				gateway.createOrder({
					amountInPaise: 1000,
					currency: 'INR',
					receiptId: 'rcpt_err_1',
				}),
			).rejects.toThrow('Internal Razorpay Server Error');

			await expect(
				gateway.createOrder({
					amountInPaise: 1000,
					currency: 'INR',
					receiptId: 'rcpt_err_2',
				}),
			).rejects.toThrow('Internal Razorpay Server Error');

			// AC 4: Health check must reflect degraded / unhealthy state
			expect(gateway.isHealthy()).toBe(false);

			// AC 1: Subsequent call must fail-fast with PaymentGatewayUnavailableError in < 5ms without issuing HTTP calls
			const startTime = Date.now();
			await expect(
				gateway.createOrder({
					amountInPaise: 1000,
					currency: 'INR',
					receiptId: 'rcpt_blocked',
				}),
			).rejects.toThrow(PaymentGatewayUnavailableError);
			const duration = Date.now() - startTime;

			expect(duration).toBeLessThanOrEqual(50); // Generous assertion for CI / slow runners, typically < 5ms
			// Underlying client was NOT called for the blocked request (still 2 calls from the failures)
			expect(mockOrdersCreate).toHaveBeenCalledTimes(2);
		});

		it('should fast-fail getPaymentDetails when payments circuit breaker is OPEN', async () => {
			const networkError = new Error('connect ECONNREFUSED 127.0.0.1:443');
			mockPaymentsFetch.mockRejectedValue(networkError);

			for (let i = 0; i < 2; i++) {
				await expect(gateway.getPaymentDetails('pay_fail')).rejects.toThrow('connect ECONNREFUSED');
			}

			expect(gateway.isHealthy()).toBe(false);

			// Fast-fail check
			await expect(gateway.getPaymentDetails('pay_fast_fail')).rejects.toThrow(
				PaymentGatewayUnavailableError,
			);
			expect(mockPaymentsFetch).toHaveBeenCalledTimes(2);
		});

		it('should fast-fail createRefund when refunds circuit breaker is OPEN', async () => {
			const serverError = Object.assign(new Error('Razorpay 500 Internal Error'), {
				statusCode: 500,
			});
			mockPaymentsRefund.mockRejectedValue(serverError);

			for (let i = 0; i < 2; i++) {
				await expect(
					gateway.createRefund({
						paymentId: 'pay_fail',
						amountInPaise: 1000,
					}),
				).rejects.toThrow('Razorpay 500 Internal Error');
			}

			expect(gateway.isHealthy()).toBe(false);

			// Fast-fail check
			await expect(
				gateway.createRefund({
					paymentId: 'pay_fast_fail',
					amountInPaise: 1000,
				}),
			).rejects.toThrow(PaymentGatewayUnavailableError);
			expect(mockPaymentsRefund).toHaveBeenCalledTimes(2);
		});
	});

	describe('AC 3 & AC 5: Half-Open Trial & Automated Recovery', () => {
		it('should transition to HALF_OPEN after resetTimeoutMs and recover to CLOSED upon successful trial', async () => {
			const serverError = Object.assign(new Error('Razorpay 502 Bad Gateway'), {
				statusCode: 502,
			});
			mockOrdersCreate.mockRejectedValue(serverError);

			// Trip breaker
			for (let i = 0; i < 2; i++) {
				await expect(
					gateway.createOrder({
						amountInPaise: 1000,
						currency: 'INR',
						receiptId: `rcpt_trip_${i}`,
					}),
				).rejects.toThrow('Razorpay 502 Bad Gateway');
			}
			expect(gateway.isHealthy()).toBe(false);

			// Wait for resetTimeoutMs (150ms configured for this test)
			await new Promise((resolve) => setTimeout(resolve, 180));

			// Next call should be trial in HALF_OPEN state
			mockOrdersCreate.mockResolvedValueOnce({
				id: 'order_recovered_123',
				amount: 1000,
				currency: 'INR',
				status: 'created',
				receipt: 'rcpt_trial',
			});

			const recoveryResult = await gateway.createOrder({
				amountInPaise: 1000,
				currency: 'INR',
				receiptId: 'rcpt_trial',
			});

			expect(recoveryResult.orderId).toBe('order_recovered_123');
			expect(gateway.isHealthy()).toBe(true);
		});

		it('should trip back to OPEN if trial request in HALF_OPEN fails', async () => {
			const serverError = Object.assign(new Error('Razorpay 503 Service Unavailable'), {
				statusCode: 503,
			});
			mockOrdersCreate.mockRejectedValue(serverError);

			// Trip breaker to OPEN
			for (let i = 0; i < 2; i++) {
				await expect(
					gateway.createOrder({
						amountInPaise: 1000,
						currency: 'INR',
						receiptId: `rcpt_trip_${i}`,
					}),
				).rejects.toThrow();
			}
			expect(gateway.isHealthy()).toBe(false);

			// Wait for cooldown
			await new Promise((resolve) => setTimeout(resolve, 180));

			// Trial request fails again
			mockOrdersCreate.mockRejectedValueOnce(serverError);

			await expect(
				gateway.createOrder({
					amountInPaise: 1000,
					currency: 'INR',
					receiptId: 'rcpt_trial_fail',
				}),
			).rejects.toThrow('Razorpay 503 Service Unavailable');

			// Circuit trips back to OPEN and reports unhealthy
			expect(gateway.isHealthy()).toBe(false);

			// Subsequent call immediately fast-fails
			await expect(
				gateway.createOrder({
					amountInPaise: 1000,
					currency: 'INR',
					receiptId: 'rcpt_fast_fail_again',
				}),
			).rejects.toThrow(PaymentGatewayUnavailableError);
		});
	});

	describe('AC 5: Request Timeouts Triggering Breaker', () => {
		it('should treat slow requests exceeding timeoutMs as failures and trip breaker', async () => {
			// Hanging call longer than timeoutMs (100ms)
			mockOrdersCreate.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 250)));

			// Trigger 2 timed out requests to trip breaker
			for (let i = 0; i < 2; i++) {
				await expect(
					gateway.createOrder({
						amountInPaise: 1000,
						currency: 'INR',
						receiptId: `rcpt_slow_${i}`,
					}),
				).rejects.toThrow(PaymentGatewayUnavailableError);
			}

			// Should trip to OPEN due to timeouts
			expect(gateway.isHealthy()).toBe(false);

			// Next call immediately fast-fails with PaymentGatewayUnavailableError without waiting 100ms
			const start = Date.now();
			await expect(
				gateway.createOrder({
					amountInPaise: 1000,
					currency: 'INR',
					receiptId: 'rcpt_after_timeout',
				}),
			).rejects.toThrow(PaymentGatewayUnavailableError);
			expect(Date.now() - start).toBeLessThan(50);
		});

		it('should convert timeouts in getPaymentDetails and createRefund to PaymentGatewayUnavailableError', async () => {
			mockPaymentsFetch.mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 250)),
			);
			await expect(gateway.getPaymentDetails('pay_slow')).rejects.toThrow(
				PaymentGatewayUnavailableError,
			);

			mockPaymentsRefund.mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 250)),
			);
			await expect(
				gateway.createRefund({ paymentId: 'pay_slow', amountInPaise: 1000 }),
			).rejects.toThrow(PaymentGatewayUnavailableError);
		});
	});

	describe('HMAC Signature Verification Non-Network Operations', () => {
		it('should perform local HMAC verification without calling network or circuit breaker', () => {
			const orderId = 'order_test_999';
			const paymentId = 'pay_test_888';
			// Using keySecret from test/setup.ts: 'test_secret_key_1234567890'
			const validSignature = require('node:crypto')
				.createHmac('sha256', 'test_secret_key_1234567890')
				.update(`${orderId}|${paymentId}`)
				.digest('hex');

			const isValid = gateway.verifyPaymentSignature({
				orderId,
				paymentId,
				signature: validSignature,
			});

			expect(isValid).toBe(true);
			expect(
				gateway.verifyPaymentSignature({
					orderId,
					paymentId,
					signature: 'invalid_sig',
				}),
			).toBe(false);
		});
	});
});
