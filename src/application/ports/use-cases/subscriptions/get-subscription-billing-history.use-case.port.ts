import type {
	GetSubscriptionBillingHistoryQueryDTO,
	SubscriptionBillingHistoryResponseDTO,
} from '@application/dtos/subscriptions/subscription-billing-history.dto.ts';

export interface IGetSubscriptionBillingHistoryUseCase {
	execute(
		dto: GetSubscriptionBillingHistoryQueryDTO,
	): Promise<SubscriptionBillingHistoryResponseDTO>;
}
