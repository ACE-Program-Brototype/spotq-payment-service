import { prisma } from '../src/infrastructure/database/prisma';
import { PaymentSubscriptionExpiryService } from '../src/infrastructure/services/subscription-expiry.service';

const mockTx = {
	subscription: {
		updateMany: jest.fn().mockResolvedValue({ count: 2 }),
	},
	outboxEvent: {
		create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
	},
};

jest.mock('../src/infrastructure/database/prisma', () => ({
	prisma: {
		subscription: {
			findMany: jest.fn(),
			updateMany: jest.fn(),
		},
		$transaction: jest.fn((callback) => callback(mockTx)),
	},
}));

jest.mock('../src/infrastructure/logger', () => ({
	logger: {
		info: jest.fn(),
		error: jest.fn(),
	},
}));

describe('PaymentSubscriptionExpiryService', () => {
	let service: PaymentSubscriptionExpiryService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new PaymentSubscriptionExpiryService();
	});

	afterEach(() => {
		service.stop();
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

		(prisma.subscription.findMany as jest.Mock).mockResolvedValue(mockPastDue);

		const count = await service.expirePastDueSubscriptions(fixedNow);

		expect(prisma.subscription.findMany).toHaveBeenCalledWith({
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

	it('returns 0 when no subscriptions are past due', async () => {
		(prisma.subscription.findMany as jest.Mock).mockResolvedValue([]);

		const count = await service.expirePastDueSubscriptions();

		expect(count).toBe(0);
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('handles database errors gracefully and rethrows', async () => {
		(prisma.subscription.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

		await expect(service.expirePastDueSubscriptions()).rejects.toThrow('DB error');
	});
});
