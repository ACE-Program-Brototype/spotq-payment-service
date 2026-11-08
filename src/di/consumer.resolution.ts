import type { OrderInvoiceConsumer } from '@infrastructure/messaging/order-invoice.consumer.ts';
import { container } from './container.ts';
import { TYPES } from './types.ts';

export const orderInvoiceConsumer = container.get<OrderInvoiceConsumer>(
	TYPES.Consumers.OrderInvoiceConsumer,
);
