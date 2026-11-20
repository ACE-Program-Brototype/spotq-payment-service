import { RabbitMQClient } from '@spotq-org/rabbitmq-client';
import { logger } from '../src/infrastructure/logger/index.ts';
import { RABBITMQ_QUEUES } from '../src/shared/constants/payment.constants.ts';

const testEvent = {
	eventId: crypto.randomUUID(),
	eventType: 'order.payment.invoice',
	aggregateId: '25679960-2f90-44f0-bb04-59e10a2a1fad',
	timestamp: new Date().toISOString(),
	orderData: {
		orderId: '25679960-2f90-44f0-bb04-59e10a2a1fad',
		orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}-TEST`,
		paymentId: crypto.randomUUID(),
		restaurantId: '7837b94b-d0c4-4e94-9eb9-81a1d4116701',
		restaurantName: 'hai restaurant',
		customerId: '911588f8-9ae1-439f-aeeb-c31b67c2b8a8',
		customerName: 'Allu Ameen',
		customerPhone: '+91 823727822',
		orderingMode: 'SELF_ORDER',
		tableNumber: null,
		queueEntryId: null,
		paymentMode: 'ONLINE',
		paymentStatus: 'PAID',
		orderStatus: 'CONFIRMED',
		currency: 'INR',
		specialInstructions: null,
		financials: {
			subtotal: 36,
			taxAmount: 1.8,
			platformFee: 0,
			discountAmount: 0,
			grandTotal: 37.8,
			amountPaise: 3780,
		},
		items: [
			{
				menuItemId: '393400c7-2fef-44a8-8b30-2cb2b0d78154',
				itemName: 'Biriyani',
				variantId: null,
				variantName: null,
				quantity: 3,
				unitPrice: 12,
				totalPrice: 36,
				specialInstructions: null,
				addons: [],
			},
		],
		createdAt: new Date().toISOString(),
		confirmedAt: new Date().toISOString(),
	},
};

async function main() {
	let rmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
	// If executed from host machine outside Docker, replace internal docker hostname "rabbitmq" with "localhost"
	if (rmqUrl.includes('@rabbitmq:')) {
		rmqUrl = rmqUrl.replace('@rabbitmq:', '@localhost:');
	}
	console.log(`\n1. Connecting to RabbitMQ at ${rmqUrl}...`);

	const client = new RabbitMQClient({
		url: rmqUrl,
		serviceName: 'test-publisher',
		logger,
	});

	await client.connect();

	console.log(
		`2. Publishing order.payment.invoice event to queue: "${RABBITMQ_QUEUES.PAYMENT_EVENTS}"...`,
	);
	console.log(`   Order Number: ${testEvent.orderData.orderNumber}`);
	console.log(`   Payment ID:   ${testEvent.orderData.paymentId}`);

	await client.publishToQueue(RABBITMQ_QUEUES.PAYMENT_EVENTS, testEvent);

	console.log(
		`\n SUCCESS! Message published to RabbitMQ queue "${RABBITMQ_QUEUES.PAYMENT_EVENTS}".`,
	);
	console.log(
		'If payment-service is running, check its console logs to see the invoice consumer processing this event!\n',
	);

	await client.close();
}

main().catch((err) => {
	console.error('\n Failed to publish event:', err);
	process.exit(1);
});
