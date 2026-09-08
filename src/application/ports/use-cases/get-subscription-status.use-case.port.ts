import type { SubscriptionStatusOutput } from '@application/dtos/get-subscription-status.dto.ts';

export interface IGetSubscriptionStatusUseCase {
	execute(restaurantId: string): Promise<SubscriptionStatusOutput>;
}
