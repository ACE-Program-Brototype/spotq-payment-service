import type {
	HandleWebhookInput,
	HandleWebhookOutput,
} from '@application/dtos/handle-webhook.dto.ts';

export interface IHandleWebhookUseCase {
	execute(params: HandleWebhookInput): Promise<HandleWebhookOutput>;
}
