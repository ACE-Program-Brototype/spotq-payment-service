export type OutboxStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

export interface OutboxEventData {
	id: string;
	eventType: string;
	aggregateId: string;
	payload: Record<string, unknown>;
	status: OutboxStatus;
	retryCount: number;
	lastError?: string | null;
	createdAt: Date;
	publishedAt?: Date | null;
}

export interface IOutboxRepository {
	create(data: {
		eventType: string;
		aggregateId: string;
		payload: Record<string, unknown>;
	}): Promise<OutboxEventData>;
	findPendingEvents(limit?: number): Promise<OutboxEventData[]>;
	findDeadLetterEvents(limit?: number): Promise<OutboxEventData[]>;
	markPublished(id: string): Promise<void>;
	recordFailure(
		id: string,
		error: string,
		maxRetries?: number,
	): Promise<{ isDeadLetter: boolean; retryCount: number }>;
	replayDeadLetter(id: string): Promise<OutboxEventData>;
}
