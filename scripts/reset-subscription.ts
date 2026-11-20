import { prisma } from '../src/infrastructure/database/prisma.ts';

async function main() {
	const restaurantId = process.argv[2];

	console.log('\nResetting subscriptions in payment ledger...');

	const whereClause = restaurantId ? { restaurantId } : {};

	const updatedSubs = await prisma.subscription.updateMany({
		where: { ...whereClause, status: 'ACTIVE' },
		data: { status: 'EXPIRED' },
	});

	console.log(`Expired ${updatedSubs.count} active subscription(s) in payment service.`);
	console.log('Payment service is now ready for a fresh checkout test.\n');
}

main()
	.catch((err) => {
		console.error('Failed to reset subscriptions:', err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
