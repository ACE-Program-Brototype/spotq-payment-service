import { prisma } from '../src/infrastructure/database/prisma';
import { PaymentSubscriptionExpiryService } from '../src/infrastructure/services/subscription-expiry.service';

jest.mock('../src/infrastructure/database/prisma', () => ({
	prisma: {
		subscription: {
			updateMany: jest.fn(),
		},
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

	it('updates past-due ACTIVE subscriptions to EXPIRED', async () => {
		const fixedNow = new Date('2026-09-07T12:00:00Z');
		(prisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

		const count = await service.expirePastDueSubscriptions(fixedNow);

		expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
			where: {
				status: 'ACTIVE',
				currentPeriodEnd: {
					lt: fixedNow,
				},
			},
			data: {
				status: 'EXPIRED',
			},
		});
		expect(count).toBe(2);
	});

	it('returns 0 when no subscriptions are past due', async () => {
		(prisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

		const count = await service.expirePastDueSubscriptions();

		expect(count).toBe(0);
	});

	it('handles database errors gracefully and rethrows', async () => {
		(prisma.subscription.updateMany as jest.Mock).mockRejectedValue(new Error('DB error'));

		await expect(service.expirePastDueSubscriptions()).rejects.toThrow('DB error');
	});
});
