import Razorpay from 'razorpay';
import { config } from '../src/config/index.ts';
import { prisma } from '../src/infrastructure/database/prisma.ts';

async function main() {
	// Parse optional CLI arguments: tsx scripts/seed-failed-transaction.ts <customerId> <orderId> <amountInRupees>
	const customerId = process.argv[2] || '2e529425-78f3-4f21-9447-677538aac462';
	const orderId = process.argv[3] || 'ce559b09-a501-4265-96d3-1f4e046014f7';
	const restaurantId = 'e4ef79b6-c4f5-4e8d-9247-832eb8660aac';
	const amountInRupees = Number(process.argv[4] || 414.5);
	const amountPaise = amountInRupees * 100;

	console.log('\n💳 Seeding a sample FAILED transaction into database...');

	let razorpayOrderId: string;
	const { keyId, keySecret } = config.razorpay;

	if (keyId && keySecret && keyId.trim().length > 0 && keySecret.trim().length > 0) {
		try {
			const razorpay = new Razorpay({
				key_id: keyId,
				key_secret: keySecret,
			});

			const order = await razorpay.orders.create({
				amount: amountPaise,
				currency: 'INR',
				receipt: `seed_${Date.now()}`.slice(0, 30),
				notes: {
					customerId,
					orderId,
					restaurantId,
				},
			});

			razorpayOrderId = order.id;
			console.log(`🌐 Created REAL order in Razorpay API: ${razorpayOrderId}`);
		} catch (rzpErr) {
			console.warn(
				'⚠️  Could not create order in Razorpay directly, using simulated order ID:',
				rzpErr,
			);
			razorpayOrderId = `order_simulated_${Date.now()}`;
		}
	} else {
		razorpayOrderId = `order_simulated_${Date.now()}`;
		console.log(
			`ℹ️  No Razorpay credentials found in env; using simulated order ID: ${razorpayOrderId}`,
		);
	}

	const tx = await prisma.paymentTransaction.create({
		data: {
			restaurantId,
			customerId,
			orderId,
			razorpayOrderId,
			amountPaise,
			currency: 'INR',
			status: 'FAILED',
			failureReason: 'Payment timed out by customer bank (Sample)',
			metadata: {
				orderNumber: `SQ-${Math.floor(10000 + Math.random() * 90000)}`,
				customerName: 'Test Diner',
				paymentMethod: 'UPI',
			},
			// Created just now so it is within the 15-minute retry window
			createdAt: new Date(),
		},
	});

	console.log('\n✅ Successfully created sample failed transaction in DB:');
	console.log('--------------------------------------------------');
	console.log(`Transaction ID : ${tx.id}`);
	console.log(`Customer ID    : ${tx.customerId}`);
	console.log(`Order ID       : ${tx.orderId}`);
	console.log(`Razorpay Order : ${tx.razorpayOrderId}`);
	console.log(`Amount         : ₹${amountInRupees} (${tx.amountPaise} paise)`);
	console.log(`Status         : ${tx.status}`);
	console.log(`Retry Eligible : true (created just now)`);
	console.log('--------------------------------------------------\n');

	console.log('To test with curl or Postman:');
	console.log(`1. History: GET /api/v1/payments/history`);
	console.log(`   Headers: x-user-id: ${tx.customerId}`);
	console.log(`            x-user-role: CUSTOMER\n`);
	console.log(`2. Retry  : POST /api/v1/payments/transactions/${tx.id}/retry`);
	console.log(`   Headers: x-user-id: ${tx.customerId}`);
	console.log(`            x-user-role: CUSTOMER\n`);
}

main()
	.catch((err) => {
		console.error('❌ Failed to seed transaction:', err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
