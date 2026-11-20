import { randomUUID } from 'node:crypto';
import type { IOrderInvoiceConsumer } from '@application/ports/messaging/order-invoice.consumer.port.ts';
import type { IGenerateOrderInvoiceUseCase } from '@application/ports/use-cases/generate-order-invoice.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import { logger, loggerLocalStorage } from '@infrastructure/logger/index.ts';
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
			logger.warn(
				{ context: { queue: RABBITMQ_QUEUES.PAYMENT_EVENTS } },
				'OrderInvoiceConsumer is already running',
			);
			return;
		}

		logger.info(
			{
				job: {
					queue: RABBITMQ_QUEUES.PAYMENT_EVENTS,
					status: 'STARTING',
				},
			},
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
		logger.info(
			{
				job: {
					queue: RABBITMQ_QUEUES.PAYMENT_EVENTS,
					status: 'STOPPED',
				},
			},
			'OrderInvoiceConsumer stopped',
		);
	}

	private async handleMessage(rawMessage: unknown): Promise<void> {
		if (!this.isRunning) {
			logger.warn(
				{ context: { queue: RABBITMQ_QUEUES.PAYMENT_EVENTS } },
				'OrderInvoiceConsumer is stopped, ignoring incoming message',
			);
			return;
		}

		const message = rawMessage as {
			eventType?: string;
			correlationId?: string;
			correlation_id?: string;
		} | null;

		if (!message || message.eventType !== INVOICE_EVENTS.ORDER_PAYMENT_INVOICE) {
			logger.debug(
				{ context: { eventType: message?.eventType } },
				'Ignored non-invoice event in OrderInvoiceConsumer',
			);
			return;
		}

		const correlationId = message.correlationId || message.correlation_id || randomUUID();

		await loggerLocalStorage.run({ correlationId, requestId: correlationId }, async () => {
			const startTime = process.hrtime.bigint();

			const result = orderPaymentInvoiceEventSchema.safeParse(rawMessage);
			if (!result.success) {
				logger.warn(
					{
						error: {
							name: 'ValidationError',
							message: 'Malformed queue message payload',
						},
						job: {
							queue: RABBITMQ_QUEUES.PAYMENT_EVENTS,
							routing_key: INVOICE_EVENTS.ORDER_PAYMENT_INVOICE,
							status: 'REJECTED',
						},
					},
					'Ignored malformed order.payment.invoice event message',
				);
				return;
			}

			logger.debug(
				{
					job: {
						queue: RABBITMQ_QUEUES.PAYMENT_EVENTS,
						routing_key: INVOICE_EVENTS.ORDER_PAYMENT_INVOICE,
						status: 'PROCESSING',
					},
					context: {
						order_id: result.data.orderData.orderId,
					},
				},
				`Processing queue message '${INVOICE_EVENTS.ORDER_PAYMENT_INVOICE}'`,
			);

			try {
				await this.generateOrderInvoiceUseCase.execute(result.data.orderData);

				const endTime = process.hrtime.bigint();
				const durationMs = Math.round((Number(endTime - startTime) / 1_000_000) * 10) / 10;

				logger.info(
					{
						job: {
							queue: RABBITMQ_QUEUES.PAYMENT_EVENTS,
							routing_key: INVOICE_EVENTS.ORDER_PAYMENT_INVOICE,
							duration_ms: durationMs,
							status: 'SUCCESS',
						},
						context: {
							order_id: result.data.orderData.orderId,
							order_number: result.data.orderData.orderNumber,
						},
					},
					`Processed queue message '${INVOICE_EVENTS.ORDER_PAYMENT_INVOICE}'`,
				);
			} catch (error) {
				const endTime = process.hrtime.bigint();
				const durationMs = Math.round((Number(endTime - startTime) / 1_000_000) * 10) / 10;

				logger.error(
					{
						err: error,
						job: {
							queue: RABBITMQ_QUEUES.PAYMENT_EVENTS,
							routing_key: INVOICE_EVENTS.ORDER_PAYMENT_INVOICE,
							duration_ms: durationMs,
							status: 'FAILED',
						},
						context: {
							order_id: result.data.orderData.orderId,
						},
					},
					`Queue message '${INVOICE_EVENTS.ORDER_PAYMENT_INVOICE}' failed`,
				);
				throw error;
			}
		});
	}
}
