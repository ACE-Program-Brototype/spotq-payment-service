import { Prisma } from '@prisma/client';
import type { ISubscriptionRepository } from '../src/domain/repositories/subscription.repository.interface';
import { PrismaSubscriptionRepository } from '../src/infrastructure/repositories/prisma-subscription.repository';
import { PaymentSubscriptionExpiryService } from '../src/infrastructure/services/subscription-expiry.service';
import { AppError } from '../src/shared/errors';

jest.mock('../src/infrastructure/logger', () => ({
	logger: {
		info: jest.fn(),
		error: jest.fn(),
	},
}));

describe('PaymentSubscriptionExpiryService', () => {
	let service: PaymentSubscriptionExpiryService;
	let mockSubscriptionRepo: jest.Mocked<ISubscriptionRepository>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockSubscriptionRepo = {
			findById: jest.fn(),
			create: jest.fn(),
			findActiveByRestaurantId: jest.fn(),
			activateSubscriptionWithOutbox: jest.fn(),
			renewSubscriptionWithOutbox: jest.fn(),
			expirePastDueSubscriptionsWithOutbox: jest.fn(),
			findSubscribersPaginated: jest.fn(),
			findSubscriberDetailById: jest.fn(),
		};
		service = new PaymentSubscriptionExpiryService(mockSubscriptionRepo);
	});

	afterEach(() => {
		service.stop();
	});

	it('delegates expiry processing to subscription repository and returns count', async () => {
		const fixedNow = new Date('2026-09-07T12:00:00Z');
		mockSubscriptionRepo.expirePastDueSubscriptionsWithOutbox.mockResolvedValue(2);

		const count = await service.expirePastDueSubscriptions(fixedNow);

		expect(mockSubscriptionRepo.expirePastDueSubscriptionsWithOutbox).toHaveBeenCalledWith(
			fixedNow,
		);
		expect(count).toBe(2);
	});

	it('returns 0 when no subscriptions are past due', async () => {
		mockSubscriptionRepo.expirePastDueSubscriptionsWithOutbox.mockResolvedValue(0);

		const count = await service.expirePastDueSubscriptions();

		expect(count).toBe(0);
	});

	it('skips concurrent execution while an expiry run is in progress', async () => {
		let resolveRun: ((value: number) => void) | undefined;
		const pendingRun = new Promise<number>((resolve) => {
			resolveRun = resolve;
		});
		mockSubscriptionRepo.expirePastDueSubscriptionsWithOutbox.mockReturnValue(pendingRun);

		const firstCall = service.expirePastDueSubscriptions();
		const secondCallCount = await service.expirePastDueSubscriptions();

		expect(secondCallCount).toBe(0);
		expect(mockSubscriptionRepo.expirePastDueSubscriptionsWithOutbox).toHaveBeenCalledTimes(1);

		resolveRun?.(1);
		await expect(firstCall).resolves.toBe(1);
	});

	it('handles repository errors gracefully and rethrows', async () => {
		mockSubscriptionRepo.expirePastDueSubscriptionsWithOutbox.mockRejectedValue(
			new Error('DB error'),
		);

		await expect(service.expirePastDueSubscriptions()).rejects.toThrow('DB error');
	});
});

describe('PrismaSubscriptionRepository.expirePastDueSubscriptionsWithOutbox', () => {
	const mockTx = {
		subscription: {
			updateMany: jest.fn().mockResolvedValue({ count: 2 }),
		},
		outboxEvent: {
			create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
		},
	};

	const mockPrisma = {
		subscription: {
			findMany: jest.fn(),
		},
		$transaction: jest.fn((callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx)),
	};

	let repository: PrismaSubscriptionRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repository = new PrismaSubscriptionRepository();
		(repository as unknown as { prisma: typeof mockPrisma }).prisma = mockPrisma;
	});

	it('updates past-due ACTIVE subscriptions to EXPIRED and creates outbox events', async () => {
		const fixedNow = new Date('2026-09-07T12:00:00Z');
		const mockPastDue = [
			{
				id: 'sub-1',
				restaurantId: 'res-1',
				currentPeriodEnd: new Date('2026-09-01T00:00:00Z'),
				plan: { code: 'QUEUE_PRO' },
			},
			{
				id: 'sub-2',
				restaurantId: 'res-2',
				currentPeriodEnd: new Date('2026-09-05T00:00:00Z'),
				plan: { code: 'QUEUE_PRO' },
			},
		];

		mockPrisma.subscription.findMany.mockResolvedValue(mockPastDue);

		const count = await repository.expirePastDueSubscriptionsWithOutbox(fixedNow);

		expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
			where: {
				status: 'ACTIVE',
				currentPeriodEnd: {
					lt: fixedNow,
				},
			},
			include: {
				plan: true,
			},
		});
		expect(mockTx.subscription.updateMany).toHaveBeenCalledWith({
			where: {
				id: { in: ['sub-1', 'sub-2'] },
			},
			data: {
				status: 'EXPIRED',
			},
		});
		expect(mockTx.outboxEvent.create).toHaveBeenCalledTimes(2);
		expect(count).toBe(2);
	});

	it('returns 0 without running a transaction when no subscriptions are past due', async () => {
		mockPrisma.subscription.findMany.mockResolvedValue([]);

		const count = await repository.expirePastDueSubscriptionsWithOutbox(new Date());

		expect(count).toBe(0);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it('translates Prisma known request errors during expiry', async () => {
		mockPrisma.subscription.findMany.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('Record missing', {
				code: 'P2025',
				clientVersion: '6.0.0',
			}),
		);

		await expect(repository.expirePastDueSubscriptionsWithOutbox(new Date())).rejects.toThrow(
			AppError,
		);
	});
});
