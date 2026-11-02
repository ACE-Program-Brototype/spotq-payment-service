export const TYPES = {
	Repositories: {
		SubscriptionRepository: Symbol.for('ISubscriptionRepository'),
		SubscriptionPlanRepository: Symbol.for('ISubscriptionPlanRepository'),
		PaymentTransactionRepository: Symbol.for('IPaymentTransactionRepository'),
		OutboxRepository: Symbol.for('IOutboxRepository'),
		BillingInvoiceRepository: Symbol.for('IBillingInvoiceRepository'),
		FinanceQueryRepository: Symbol.for('FinanceQueryRepository'),
		PlatformLedgerTransactionRepository: Symbol.for('IPlatformLedgerTransactionRepository'),
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
		GetPlatformFinanceSummaryUseCase: Symbol.for('IGetPlatformFinanceSummaryUseCase'),
		GetPlatformMasterLedgerUseCase: Symbol.for('IGetPlatformMasterLedgerUseCase'),
	},
	Controllers: {
		SubscriptionController: Symbol.for('SubscriptionController'),
		PlatformFinanceController: Symbol.for('PlatformFinanceController'),
	},
} as const;
