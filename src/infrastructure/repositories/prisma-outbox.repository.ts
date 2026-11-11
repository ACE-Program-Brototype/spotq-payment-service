import type {
	IOutboxRepository,
	OutboxEventData,
} from '@domain/repositories/outbox.repository.interface.ts';
import type { Prisma, OutboxEvent as PrismaOutboxEvent } from '@prisma/client';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

type CreateOutboxInput = {
	eventType: string;
	aggregateId: string;
	payload: Record<string, unknown>;
};

@injectable()
export class PrismaOutboxRepository
	extends PrismaBaseRepository<
		OutboxEventData,
		PrismaOutboxEvent,
		Prisma.OutboxEventWhereInput,
		CreateOutboxInput,
		Prisma.OutboxEventUpdateInput,
		Prisma.OutboxEventCreateInput,
		Prisma.OutboxEventUpdateInput
	>
	implements IOutboxRepository
{
	protected override getModel() {
		return this.prisma.outboxEvent;
	}

	protected override mapToDomain(record: PrismaOutboxEvent): OutboxEventData {
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

	protected override toCreatePersistence(data: CreateOutboxInput): Prisma.OutboxEventCreateInput {
		return {
			eventType: data.eventType,
			aggregateId: data.aggregateId,
			payload: data.payload as Prisma.InputJsonValue,
			status: 'PENDING',
		};
	}

	async findPendingEvents(limit = 50): Promise<OutboxEventData[]> {
		return this.find({
			where: { status: 'PENDING' },
			orderBy: { createdAt: 'asc' },
			take: limit,
		});
	}

	async findDeadLetterEvents(limit = 50): Promise<OutboxEventData[]> {
		return this.find({
			where: { status: 'FAILED' },
			orderBy: { createdAt: 'desc' },
			take: limit,
		});
	}

	async markPublished(id: string): Promise<void> {
		await this.executePrisma(() =>
			this.prisma.outboxEvent.update({
				where: { id },
				data: {
					status: 'PUBLISHED',
					publishedAt: new Date(),
				},
			}),
		);
	}

	async recordFailure(
		id: string,
		error: string,
		maxRetries = 5,
	): Promise<{ isDeadLetter: boolean; retryCount: number }> {
		return this.executePrisma(async () => {
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
		});
	}

	async replayDeadLetter(id: string): Promise<OutboxEventData> {
		return this.executePrisma(async () => {
			const updated = await this.prisma.outboxEvent.update({
				where: { id },
				data: {
					status: 'PENDING',
					retryCount: 0,
					lastError: null,
				},
			});

			return this.mapToDomain(updated);
		});
	}
}
