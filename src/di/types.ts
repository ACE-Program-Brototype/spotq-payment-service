export const TYPES = {
	Repositories: {
		SubscriptionRepository: Symbol.for('ISubscriptionRepository'),
		SubscriptionPlanRepository: Symbol.for('ISubscriptionPlanRepository'),
		PaymentTransactionRepository: Symbol.for('IPaymentTransactionRepository'),
		OutboxRepository: Symbol.for('IOutboxRepository'),
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
	},
	Controllers: {
		SubscriptionController: Symbol.for('SubscriptionController'),
	},
} as const;
