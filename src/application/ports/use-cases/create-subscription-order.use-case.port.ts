import type {
	CreateSubscriptionOrderInput,
	CreateSubscriptionOrderOutput,
} from '@application/dtos/create-subscription-order.dto.ts';

export interface ICreateSubscriptionOrderUseCase {
	execute(input: CreateSubscriptionOrderInput): Promise<CreateSubscriptionOrderOutput>;
}
