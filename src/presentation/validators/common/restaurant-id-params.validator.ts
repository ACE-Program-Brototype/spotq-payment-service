import z from 'zod';

export const restaurantIdParamsSchema = z.object({
	restaurantId: z.uuid(),
});

export type RestaurantIdParams = z.infer<typeof restaurantIdParamsSchema>;
