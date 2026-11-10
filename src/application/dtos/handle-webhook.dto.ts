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

export interface WebhookPayoutEntity {
	id: string;
	reference_id: string | null;
	status: string;
	utr?: string | null;
	failure_reason?: string | null;
}

export interface WebhookRefundEntity {
	id: string;
	payment_id?: string;
	amount?: number;
	currency?: string;
	status?: string;
	arn?: string | null;
	notes?: Record<string, unknown>;
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
		payout?: {
			entity?: WebhookPayoutEntity;
		};
		refund?: {
			entity?: WebhookRefundEntity;
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
