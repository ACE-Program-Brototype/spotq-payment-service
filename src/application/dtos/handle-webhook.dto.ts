export interface WebhookPaymentEntity {
	id: string;
	order_id: string;
	status: string;
	amount: number;
	error_description?: string;
	error_reason?: string;
}

export interface WebhookOrderEntity {
	id: string;
	status: string;
}

export interface WebhookPayload {
	event: string;
	payload?: {
		payment?: {
			entity?: WebhookPaymentEntity;
		};
		order?: {
			entity?: WebhookOrderEntity;
		};
	};
}

export interface HandleWebhookInput {
	rawBody: string;
	signature: string;
	parsedPayload: WebhookPayload;
}

export interface HandleWebhookOutput {
	received: boolean;
}
