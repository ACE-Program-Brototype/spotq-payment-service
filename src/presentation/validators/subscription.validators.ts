import { z } from 'zod';

export const createSubscriptionOrderSchema = z.object({
	planId: z.string().uuid({ message: 'Valid Plan ID is required' }),
	restaurantId: z.string().uuid().optional(),
	restaurantName: z.string().optional(),
	restaurantEmail: z.string().email().optional(),
	restaurantPhone: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
	razorpayOrderId: z.string().min(1, { message: 'razorpayOrderId is required' }),
	razorpayPaymentId: z.string().min(1, { message: 'razorpayPaymentId is required' }),
	razorpaySignature: z.string().min(1, { message: 'razorpaySignature is required' }),
});

export type CreateSubscriptionOrderDto = z.infer<typeof createSubscriptionOrderSchema>;
export type VerifyPaymentDto = z.infer<typeof verifyPaymentSchema>;
