import type { WebhookPayload } from '@application/dtos/handle-webhook.dto.ts';
import type { RazorpayWebhookEvent } from '@shared/constants/index.ts';

/**
 * Strategy contract for handling specific Razorpay webhook events.
 */
export interface IWebhookEventHandler {
	readonly supportedEvents: readonly RazorpayWebhookEvent[];
	handle(eventType: string, payload: WebhookPayload): Promise<void>;
}
