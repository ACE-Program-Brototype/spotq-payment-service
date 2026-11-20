import type {
	IOutboxRepository,
	OutboxEventData,
} from '@domain/repositories/outbox.repository.interface.ts';
import type { Prisma } from '@prisma/client';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaOutboxRepository extends PrismaBaseRepository implements IOutboxRepository {
	async create(data: {
		eventType: string;
		aggregateId: string;
		payload: Record<string, unknown>;
	}): Promise<OutboxEventData> {
		const record = await this.prisma.outboxEvent.create({
			data: {
				eventType: data.eventType,
				aggregateId: data.aggregateId,
				payload: data.payload as Prisma.InputJsonValue,
				status: 'PENDING',
			},
		});

		return {
			id: record.id,
			eventType: record.eventType,
			aggregateId: record.aggregateId,
			payload: record.payload as Record<string, unknown>,
			status: record.status,
			retryCount: record.retryCount,
			lastError: record.lastError,
			createdAt: record.createdAt,
			publishedAt: record.publishedAt,
		};
	}

	async findPendingEvents(limit = 50): Promise<OutboxEventData[]> {
		const records = await this.prisma.outboxEvent.findMany({
			where: { status: 'PENDING' },
			orderBy: { createdAt: 'asc' },
			take: limit,
		});

		return records.map((record) => ({
			id: record.id,
			eventType: record.eventType,
			aggregateId: record.aggregateId,
			payload: record.payload as Record<string, unknown>,
			status: record.status,
			retryCount: record.retryCount,
			lastError: record.lastError,
			createdAt: record.createdAt,
			publishedAt: record.publishedAt,
		}));
	}

	async findDeadLetterEvents(limit = 50): Promise<OutboxEventData[]> {
		const records = await this.prisma.outboxEvent.findMany({
			where: { status: 'FAILED' },
			orderBy: { createdAt: 'desc' },
			take: limit,
		});

		return records.map((record) => ({
			id: record.id,
			eventType: record.eventType,
			aggregateId: record.aggregateId,
			payload: record.payload as Record<string, unknown>,
			status: record.status,
			retryCount: record.retryCount,
			lastError: record.lastError,
			createdAt: record.createdAt,
			publishedAt: record.publishedAt,
		}));
	}

	async markPublished(id: string): Promise<void> {
		await this.prisma.outboxEvent.update({
			where: { id },
			data: {
				status: 'PUBLISHED',
				publishedAt: new Date(),
			},
		});
	}

	async recordFailure(
		id: string,
		error: string,
		maxRetries = 5,
	): Promise<{ isDeadLetter: boolean; retryCount: number }> {
		const current = await this.prisma.outboxEvent.findUnique({
			where: { id },
			select: { retryCount: true },
		});

		const nextRetryCount = (current?.retryCount ?? 0) + 1;
		const isDeadLetter = nextRetryCount >= maxRetries;

		await this.prisma.outboxEvent.update({
			where: { id },
			data: {
				retryCount: nextRetryCount,
				lastError: error,
				status: isDeadLetter ? 'FAILED' : 'PENDING',
			},
		});

		return { isDeadLetter, retryCount: nextRetryCount };
	}

	async replayDeadLetter(id: string): Promise<OutboxEventData> {
		const updated = await this.prisma.outboxEvent.update({
			where: { id },
			data: {
				status: 'PENDING',
				retryCount: 0,
				lastError: null,
			},
		});

		return {
			id: updated.id,
			eventType: updated.eventType,
			aggregateId: updated.aggregateId,
			payload: updated.payload as Record<string, unknown>,
			status: updated.status,
			retryCount: updated.retryCount,
			lastError: updated.lastError,
			createdAt: updated.createdAt,
			publishedAt: updated.publishedAt,
		};
	}
}
