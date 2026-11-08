import type { IOrderInvoiceConsumer } from '@application/ports/messaging/order-invoice.consumer.port.ts';
import type { IGenerateOrderInvoiceUseCase } from '@application/ports/use-cases/generate-order-invoice.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { logger } from '@infrastructure/logger/index.ts';
import type { RabbitMQService } from '@infrastructure/rabbitmq/index.ts';
import { orderPaymentInvoiceEventSchema } from '@presentation/validators/events/order-invoice-event.validator.ts';
import { INVOICE_EVENTS, RABBITMQ_QUEUES } from '@shared/constants/payment.constants.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class OrderInvoiceConsumer implements IOrderInvoiceConsumer {
	private isRunning = false;

	constructor(
		@inject(TYPES.Services.RabbitMQService)
		private readonly rabbitMQService: RabbitMQService,
		@inject(TYPES.UseCases.GenerateOrderInvoiceUseCase)
		private readonly generateOrderInvoiceUseCase: IGenerateOrderInvoiceUseCase,
	) {}

	async start(): Promise<void> {
		if (this.isRunning) {
			logger.warn('OrderInvoiceConsumer is already running');
			return;
		}

		logger.info(
			{ queue: RABBITMQ_QUEUES.PAYMENT_EVENTS },
			'Starting OrderInvoiceConsumer on RabbitMQ queue',
		);

		this.isRunning = true;
		await this.rabbitMQService.consumeFromQueue(
			RABBITMQ_QUEUES.PAYMENT_EVENTS,
			this.handleMessage.bind(this),
		);
	}

	async stop(): Promise<void> {
		this.isRunning = false;
		logger.info('OrderInvoiceConsumer stopped');
	}

	async handleMessage(rawMessage: unknown): Promise<void> {
		if (!this.isRunning) {
			logger.warn('OrderInvoiceConsumer is stopped, ignoring incoming message');
			return;
		}

		const message = rawMessage as { eventType?: string } | null;
		if (!message || message.eventType !== INVOICE_EVENTS.ORDER_PAYMENT_INVOICE) {
			logger.debug(
				{ eventType: message?.eventType },
				'Ignored non-invoice event in OrderInvoiceConsumer',
			);
			return;
		}

		logger.info({ rawMessage }, 'Received order.payment.invoice event in OrderInvoiceConsumer');

		const result = orderPaymentInvoiceEventSchema.safeParse(rawMessage);
		if (!result.success) {
			logger.warn(
				{ errors: result.error.format(), rawMessage },
				'Ignored malformed order.payment.invoice event message',
			);
			return;
		}

		try {
			await this.generateOrderInvoiceUseCase.execute(result.data.orderData);
			logger.info(
				{
					orderId: result.data.orderData.orderId,
					orderNumber: result.data.orderData.orderNumber,
				},
				'Successfully processed order invoice generation from event',
			);
		} catch (error) {
			logger.error(
				{ err: error, orderId: result.data.orderData.orderId },
				'Failed to process order invoice generation in consumer',
			);
			throw error;
		}
	}
}
