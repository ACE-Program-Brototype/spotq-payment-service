import type {
	RenewSubscriptionInputDTO,
	RenewSubscriptionOutputDTO,
} from '@application/dtos/subscriptions/renew-subscription.dto.ts';

export interface IRenewSubscriptionUseCase {
	execute(input: RenewSubscriptionInputDTO): Promise<RenewSubscriptionOutputDTO>;
}
