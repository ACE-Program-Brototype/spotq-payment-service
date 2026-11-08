import { DEFAULT_CURRENCY, HTTP_HEADERS } from '@shared/constants/index.ts';
import { z } from 'zod';

export const createOrderPaymentSchema = z.object({
	orderId: z.uuid(),
	customerId: z.uuid(),
	restaurantId: z.uuid(),
	amountPaise: z.number().int().positive(),
	currency: z.string().default(DEFAULT_CURRENCY).optional(),
});

export const verifyOrderPaymentSchema = z.object({
	orderId: z.uuid(),
	razorpayOrderId: z.string().min(1),
	razorpayPaymentId: z.string().min(1),
	razorpaySignature: z.string().min(1),
});

export const getOrderPaymentStatusParamsSchema = z.object({
	orderId: z.uuid(),
});

export const processOrderRefundSchema = z.object({
	orderId: z.uuid(),
	amountPaise: z.number().int().positive().optional(),
	reason: z.string().min(1).optional(),
	notes: z.string().optional(),
});

export const processOrderRefundHeadersSchema = z
	.object({
		[HTTP_HEADERS.X_IDEMPOTENCY_KEY]: z
			.string()
			.min(1, `${HTTP_HEADERS.X_IDEMPOTENCY_KEY} header is required`),
	})
	.loose();

export type CreateOrderPaymentInputDto = z.infer<typeof createOrderPaymentSchema>;
export type VerifyOrderPaymentInputDto = z.infer<typeof verifyOrderPaymentSchema>;
export type GetOrderPaymentStatusParamsDto = z.infer<typeof getOrderPaymentStatusParamsSchema>;
export type ProcessOrderRefundInputDto = z.infer<typeof processOrderRefundSchema>;
export type ProcessOrderRefundHeadersDto = z.infer<typeof processOrderRefundHeadersSchema>;
