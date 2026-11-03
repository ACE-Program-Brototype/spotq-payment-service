export const TYPES = {
	Repositories: {
		SubscriptionRepository: Symbol.for('ISubscriptionRepository'),
		SubscriptionPlanRepository: Symbol.for('ISubscriptionPlanRepository'),
		PaymentTransactionRepository: Symbol.for('IPaymentTransactionRepository'),
		OutboxRepository: Symbol.for('IOutboxRepository'),
		BillingInvoiceRepository: Symbol.for('IBillingInvoiceRepository'),
	},
	Gateways: {
		PaymentGateway: Symbol.for('IPaymentGateway'),
	},
	Services: {
		OutboxRelayService: Symbol.for('IOutboxRelayService'),
		SubscriptionEventProducer: Symbol.for('ISubscriptionEventProducer'),
		SubscriptionExpiryService: Symbol.for('IPaymentSubscriptionExpiryService'),
		RabbitMQService: Symbol.for('RabbitMQService'),
	},
	UseCases: {
		CreateOrderPaymentUseCase: Symbol.for('ICreateOrderPaymentUseCase'),
		CreateSubscriptionOrderUseCase: Symbol.for('ICreateSubscriptionOrderUseCase'),
		GetOrderPaymentStatusUseCase: Symbol.for('IGetOrderPaymentStatusUseCase'),
		GetSubscriptionPlansUseCase: Symbol.for('IGetSubscriptionPlansUseCase'),
		GetSubscriptionStatusUseCase: Symbol.for('IGetSubscriptionStatusUseCase'),
		HandleWebhookUseCase: Symbol.for('IHandleWebhookUseCase'),
		VerifyOrderPaymentUseCase: Symbol.for('IVerifyOrderPaymentUseCase'),
		VerifyPaymentUseCase: Symbol.for('IVerifyPaymentUseCase'),
	},
	Controllers: {
		OrderPaymentController: Symbol.for('OrderPaymentController'),
		SubscriptionController: Symbol.for('SubscriptionController'),
	},
} as const;
