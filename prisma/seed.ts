import { PlanBillingCycle } from '@prisma/client';
import { prisma } from '../src/infrastructure/database/prisma';

export const initialSubscriptionPlans = [
	{
		code: 'QUEUE_PRO',
		name: 'Queue Pro',
		description: 'Real-time digital queue management for bustling restaurants',
		pricePaise: 149900,
		currency: 'INR',
		billingCycle: PlanBillingCycle.MONTHLY,
		features: [
			'Real-time digital queue management',
			'Customer remote queue joining',
			'Live queue position & ETA tracking',
			'Customer notifications & queue updates',
		],
		isActive: true,
	},
	{
		code: 'SELF_SERVICE_PRO',
		name: 'Self-Service Pro',
		description: 'Complete kiosk and self-service queue automation',
		pricePaise: 250000,
		currency: 'INR',
		billingCycle: PlanBillingCycle.MONTHLY,
		features: [
			'Self-service kiosk queue management',
			'Customer check-in & token generation',
			'Real-time queue monitoring',
			'Staff dashboard & queue controls',
		],
		isActive: true,
	},
];

async function main() {
	console.log('🌱 Starting SpotQ Subscription Plans Seeding...\n');

	for (const plan of initialSubscriptionPlans) {
		const upserted = await prisma.subscriptionPlan.upsert({
			where: { code: plan.code },
			update: {
				name: plan.name,
				description: plan.description,
				pricePaise: plan.pricePaise,
				currency: plan.currency,
				billingCycle: plan.billingCycle,
				features: plan.features,
				isActive: plan.isActive,
			},
			create: plan,
		});

		console.log(
			`   ✅ Seeded Plan: ${upserted.name.padEnd(20)} | Code: ${upserted.code.padEnd(18)} | Price: ₹${upserted.pricePaise / 100}`,
		);
	}

	console.log('\n🎉 Subscription Plans seeded successfully!');
}

main()
	.catch((error) => {
		console.error('❌ Seeding subscription plans failed:', error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
