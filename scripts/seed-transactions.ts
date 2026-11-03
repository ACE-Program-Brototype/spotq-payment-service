/**
 * Seed Script: Restaurant Payment Transactions & Refunds
 * Generates realistic customer dining transactions with full metadata,
 * itemized billing breakdowns, Razorpay references, and settlement statuses.
 */

import { randomUUID } from 'node:crypto';
import { PaymentStatus, RefundStatus } from '@prisma/client';
import { prisma } from '../src/infrastructure/database/prisma.ts';

const TARGET_RESTAURANT_ID =
	process.env.TARGET_RESTAURANT_ID || process.argv[2] || '7bdcbcc9-45dd-425f-92c0-b7b33121a3b1';

interface SeedTransactionConfig {
	orderNumber: string;
	customerName: string;
	phoneMasked: string;
	table: string;
	token: string;
	method: 'UPI' | 'CARD' | 'NETBANKING';
	subtotal: number;
	discount: number;
	status: PaymentStatus;
	settlementStatus: string;
	daysAgo: number;
	hoursAgo: number;
	isRefunded?: boolean;
	failureReason?: string;
}

const SEED_DATA: SeedTransactionConfig[] = [
	// TODAY
	{
		orderNumber: 'SQ-98214',
		customerName: 'Rahul Sharma',
		phoneMasked: '•••••• 4821',
		table: 'T-04',
		token: 'TK-28',
		method: 'UPI',
		subtotal: 82000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'PENDING_EOD',
		daysAgo: 0,
		hoursAgo: 2,
	},
	{
		orderNumber: 'SQ-98211',
		customerName: 'Priya Menon',
		phoneMasked: '•••••• 9102',
		table: 'T-08',
		token: 'TK-29',
		method: 'CARD',
		subtotal: 135000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'PENDING_EOD',
		daysAgo: 0,
		hoursAgo: 3,
	},
	{
		orderNumber: 'SQ-98205',
		customerName: 'Amit Kumar',
		phoneMasked: '•••••• 3341',
		table: 'T-02',
		token: 'TK-30',
		method: 'NETBANKING',
		subtotal: 55000,
		discount: 5000,
		status: PaymentStatus.REFUNDED,
		settlementStatus: 'DEDUCTED_EOD',
		daysAgo: 0,
		hoursAgo: 4,
		isRefunded: true,
	},
	{
		orderNumber: 'SQ-98198',
		customerName: 'Sneha Patel',
		phoneMasked: '•••••• 7762',
		table: 'T-11',
		token: 'TK-31',
		method: 'UPI',
		subtotal: 92000,
		discount: 0,
		status: PaymentStatus.FAILED,
		settlementStatus: 'N_A',
		daysAgo: 0,
		hoursAgo: 5,
		failureReason: 'Payment timed out on UPI app',
	},
	{
		orderNumber: 'SQ-98192',
		customerName: 'Ananya Das',
		phoneMasked: '•••••• 5519',
		table: 'Bar-01',
		token: 'TK-32',
		method: 'UPI',
		subtotal: 45000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'PENDING_EOD',
		daysAgo: 0,
		hoursAgo: 6,
	},

	// YESTERDAY
	{
		orderNumber: 'SQ-98175',
		customerName: 'Karthik Raja',
		phoneMasked: '•••••• 1290',
		table: 'T-06',
		token: 'TK-18',
		method: 'CARD',
		subtotal: 210000,
		discount: 10000,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 1,
		hoursAgo: 14,
	},
	{
		orderNumber: 'SQ-98168',
		customerName: 'Deepa Nair',
		phoneMasked: '•••••• 8820',
		table: 'T-03',
		token: 'TK-19',
		method: 'UPI',
		subtotal: 68000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 1,
		hoursAgo: 16,
	},
	{
		orderNumber: 'SQ-98160',
		customerName: 'Vikram Joshi',
		phoneMasked: '•••••• 6214',
		table: 'T-09',
		token: 'TK-20',
		method: 'UPI',
		subtotal: 115000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 1,
		hoursAgo: 18,
	},
	{
		orderNumber: 'SQ-98155',
		customerName: 'Rohan Mehra',
		phoneMasked: '•••••• 4099',
		table: 'T-01',
		token: 'TK-21',
		method: 'NETBANKING',
		subtotal: 78000,
		discount: 0,
		status: PaymentStatus.FAILED,
		settlementStatus: 'N_A',
		daysAgo: 1,
		hoursAgo: 20,
		failureReason: 'Bank network authorization failed',
	},
	{
		orderNumber: 'SQ-98149',
		customerName: 'Neha Verma',
		phoneMasked: '•••••• 3108',
		table: 'Bar-03',
		token: 'TK-22',
		method: 'CARD',
		subtotal: 185000,
		discount: 15000,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 1,
		hoursAgo: 21,
	},

	// 3 DAYS AGO
	{
		orderNumber: 'SQ-98120',
		customerName: 'Sanjay Gupta',
		phoneMasked: '•••••• 9021',
		table: 'T-12',
		token: 'TK-05',
		method: 'UPI',
		subtotal: 95000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 3,
		hoursAgo: 13,
	},
	{
		orderNumber: 'SQ-98115',
		customerName: 'Pooja Hegde',
		phoneMasked: '•••••• 7431',
		table: 'T-05',
		token: 'TK-06',
		method: 'CARD',
		subtotal: 240000,
		discount: 20000,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 3,
		hoursAgo: 15,
	},
	{
		orderNumber: 'SQ-98108',
		customerName: 'Manish Pandey',
		phoneMasked: '•••••• 6652',
		table: 'T-07',
		token: 'TK-07',
		method: 'UPI',
		subtotal: 62000,
		discount: 0,
		status: PaymentStatus.REFUNDED,
		settlementStatus: 'DEDUCTED_EOD',
		daysAgo: 3,
		hoursAgo: 17,
		isRefunded: true,
	},
	{
		orderNumber: 'SQ-98102',
		customerName: 'Shreya Ghoshal',
		phoneMasked: '•••••• 8291',
		table: 'T-10',
		token: 'TK-08',
		method: 'UPI',
		subtotal: 125000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 3,
		hoursAgo: 19,
	},
	{
		orderNumber: 'SQ-98095',
		customerName: 'Arjun Kapoor',
		phoneMasked: '•••••• 1822',
		table: 'Bar-02',
		token: 'TK-09',
		method: 'NETBANKING',
		subtotal: 88000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 3,
		hoursAgo: 21,
	},

	// 5 DAYS AGO
	{
		orderNumber: 'SQ-98070',
		customerName: 'Divya Spandana',
		phoneMasked: '•••••• 9514',
		table: 'T-04',
		token: 'TK-41',
		method: 'CARD',
		subtotal: 160000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 5,
		hoursAgo: 12,
	},
	{
		orderNumber: 'SQ-98062',
		customerName: 'Gautam Gambhir',
		phoneMasked: '•••••• 3840',
		table: 'T-02',
		token: 'TK-42',
		method: 'UPI',
		subtotal: 75000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 5,
		hoursAgo: 14,
	},
	{
		orderNumber: 'SQ-98055',
		customerName: 'Harish Kalyan',
		phoneMasked: '•••••• 6721',
		table: 'T-08',
		token: 'TK-43',
		method: 'UPI',
		subtotal: 110000,
		discount: 10000,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 5,
		hoursAgo: 16,
	},
	{
		orderNumber: 'SQ-98048',
		customerName: 'Isha Koppikar',
		phoneMasked: '•••••• 4299',
		table: 'T-11',
		token: 'TK-44',
		method: 'CARD',
		subtotal: 195000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 5,
		hoursAgo: 18,
	},
	{
		orderNumber: 'SQ-98040',
		customerName: 'Jayaram Subramaniam',
		phoneMasked: '•••••• 2110',
		table: 'Bar-04',
		token: 'TK-45',
		method: 'UPI',
		subtotal: 52000,
		discount: 0,
		status: PaymentStatus.FAILED,
		settlementStatus: 'N_A',
		daysAgo: 5,
		hoursAgo: 20,
		failureReason: 'Insufficient account balance',
	},

	// 10 DAYS AGO
	{
		orderNumber: 'SQ-98015',
		customerName: 'Kavya Madhavan',
		phoneMasked: '•••••• 8301',
		table: 'T-03',
		token: 'TK-11',
		method: 'UPI',
		subtotal: 89000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 10,
		hoursAgo: 13,
	},
	{
		orderNumber: 'SQ-98008',
		customerName: 'Lokesh Kanagaraj',
		phoneMasked: '•••••• 4912',
		table: 'T-06',
		token: 'TK-12',
		method: 'CARD',
		subtotal: 285000,
		discount: 25000,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 10,
		hoursAgo: 15,
	},
	{
		orderNumber: 'SQ-97998',
		customerName: 'Meera Jasmine',
		phoneMasked: '•••••• 3320',
		table: 'T-09',
		token: 'TK-13',
		method: 'NETBANKING',
		subtotal: 140000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 10,
		hoursAgo: 17,
	},
	{
		orderNumber: 'SQ-97990',
		customerName: 'Nivin Pauly',
		phoneMasked: '•••••• 7188',
		table: 'T-01',
		token: 'TK-14',
		method: 'UPI',
		subtotal: 78000,
		discount: 0,
		status: PaymentStatus.SUCCESS,
		settlementStatus: 'SETTLED',
		daysAgo: 10,
		hoursAgo: 19,
	},
	{
		orderNumber: 'SQ-97982',
		customerName: 'Oviya Helen',
		phoneMasked: '•••••• 9940',
		table: 'Bar-01',
		token: 'TK-15',
		method: 'UPI',
		subtotal: 96000,
		discount: 0,
		status: PaymentStatus.REFUNDED,
		settlementStatus: 'DEDUCTED_EOD',
		daysAgo: 10,
		hoursAgo: 21,
		isRefunded: true,
	},
];

async function seed() {
	console.log(`\nStarting Transactions Seeding for Restaurant: ${TARGET_RESTAURANT_ID}`);

	let createdCount = 0;

	for (const item of SEED_DATA) {
		const createdDate = new Date();
		createdDate.setDate(createdDate.getDate() - item.daysAgo);
		createdDate.setHours(createdDate.getHours() - item.hoursAgo);

		const gstPaise = Math.round(item.subtotal * 0.05);
		const totalPaise = item.subtotal + gstPaise - item.discount;

		const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
		const razorpayPaymentId =
			item.status !== PaymentStatus.FAILED
				? `pay_${randomSuffix}${Date.now().toString().slice(-4)}`
				: null;
		const razorpayOrderId = `order_${randomSuffix}${Date.now().toString().slice(-4)}`;
		const bankRrn = Math.floor(100000000000 + Math.random() * 900000000000).toString();

		const txMetadata = {
			orderNumber: item.orderNumber,
			customerName: item.customerName,
			customerPhoneMasked: item.phoneMasked,
			tableNumber: item.table,
			tokenNumber: item.token,
			paymentMethod: item.method,
			upiVpa:
				item.method === 'UPI'
					? `${item.customerName.toLowerCase().replace(/\s+/g, '')}@okaxis`
					: undefined,
			card:
				item.method === 'CARD'
					? { network: 'Visa', last4: '4242', type: 'credit', issuer: 'HDFC Bank' }
					: undefined,
			bankReference: bankRrn,
			billingBreakdown: {
				subtotalPaise: item.subtotal,
				gstPaise: gstPaise,
				discountPaise: item.discount,
				grandTotalPaise: totalPaise,
			},
			settlement: {
				status: item.settlementStatus,
				settlementId: item.settlementStatus === 'SETTLED' ? `setl_${randomSuffix}` : null,
				scheduledPayout: item.settlementStatus === 'PENDING_EOD' ? 'Next Business Day' : null,
			},
		};

		const transaction = await prisma.paymentTransaction.create({
			data: {
				id: randomUUID(),
				restaurantId: TARGET_RESTAURANT_ID,
				orderId: randomUUID(),
				customerId: randomUUID(),
				razorpayOrderId: razorpayOrderId,
				razorpayPaymentId: razorpayPaymentId,
				amountPaise: totalPaise,
				currency: 'INR',
				status: item.status,
				failureReason: item.failureReason || null,
				metadata: txMetadata,
				createdAt: createdDate,
				updatedAt: createdDate,
			},
		});

		if (item.isRefunded && razorpayPaymentId) {
			const refundDate = new Date(createdDate.getTime() + 30 * 60 * 1000); // 30 mins after payment
			await prisma.paymentRefund.create({
				data: {
					id: randomUUID(),
					paymentTransactionId: transaction.id,
					razorpayRefundId: `rfnd_${randomSuffix}`,
					amountPaise: totalPaise,
					currency: 'INR',
					status: RefundStatus.PROCESSED,
					reason: 'Order cancelled by restaurant manager',
					arn: bankRrn,
					paymentMethod: item.method,
					createdAt: refundDate,
					processedAt: refundDate,
				},
			});
		}

		createdCount++;
	}

	console.log(
		`Successfully seeded ${createdCount} payment transactions with complete metadata & refunds.\n`,
	);
}

seed()
	.catch((err) => {
		console.error('Failed to seed transactions:', err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
