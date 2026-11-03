export const TYPES = {
	Repositories: {
		SubscriptionRepository: Symbol.for('ISubscriptionRepository'),
		SubscriptionPlanRepository: Symbol.for('ISubscriptionPlanRepository'),
		PaymentTransactionRepository: Symbol.for('IPaymentTransactionRepository'),
		TransactionQueryRepository: Symbol.for('ITransactionQueryRepository'),
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
	},
	UseCases: {
		CreateSubscriptionOrderUseCase: Symbol.for('ICreateSubscriptionOrderUseCase'),
		GetSubscriptionPlansUseCase: Symbol.for('IGetSubscriptionPlansUseCase'),
		GetSubscriptionStatusUseCase: Symbol.for('IGetSubscriptionStatusUseCase'),
		HandleWebhookUseCase: Symbol.for('IHandleWebhookUseCase'),
		VerifyPaymentUseCase: Symbol.for('IVerifyPaymentUseCase'),
		GetRestaurantTransactionsUseCase: Symbol.for('IGetRestaurantTransactionsUseCase'),
		GetTransactionDetailUseCase: Symbol.for('IGetTransactionDetailUseCase'),
	},
	Controllers: {
		SubscriptionController: Symbol.for('SubscriptionController'),
		RestaurantTransactionController: Symbol.for('RestaurantTransactionController'),
	},
} as const;
