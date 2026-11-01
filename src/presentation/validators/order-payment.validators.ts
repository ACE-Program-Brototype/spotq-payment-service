import { DEFAULT_CURRENCY } from '@shared/constants/index.ts';
import { z } from 'zod';

export const createOrderPaymentSchema = z.object({
	orderId: z.uuid(),
	customerId: z.string().min(1),
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

export type CreateOrderPaymentInputDto = z.infer<typeof createOrderPaymentSchema>;
export type VerifyOrderPaymentInputDto = z.infer<typeof verifyOrderPaymentSchema>;
export type GetOrderPaymentStatusParamsDto = z.infer<typeof getOrderPaymentStatusParamsSchema>;
