import { z } from 'zod';

export const getCustomerOrderRefundStatusParamsSchema = z.object({
	orderId: z.uuid({ message: 'Order ID must be a valid UUID' }),
});

export type GetCustomerOrderRefundStatusParams = z.infer<
	typeof getCustomerOrderRefundStatusParamsSchema
>;
