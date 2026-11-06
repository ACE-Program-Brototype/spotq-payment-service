import type { ICacheService } from '@application/ports/services/cache.service.port.ts';
import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { IPaymentSubscriptionExpiryService } from '@application/ports/services/subscription-expiry.service.port.ts';
import type { ICreateOrderPaymentUseCase } from '@application/ports/use-cases/create-order-payment.use-case.port.ts';
import type { ICreateSubscriptionOrderUseCase } from '@application/ports/use-cases/create-subscription-order.use-case.port.ts';
import type { IGetOrderPaymentStatusUseCase } from '@application/ports/use-cases/get-order-payment-status.use-case.port.ts';
import type { IGetSubscriptionPlansUseCase } from '@application/ports/use-cases/get-subscription-plans.use-case.port.ts';
import type { IGetSubscriptionStatusUseCase } from '@application/ports/use-cases/get-subscription-status.use-case.port.ts';
import type { IHandleWebhookUseCase } from '@application/ports/use-cases/handle-webhook.use-case.port.ts';
import type { IExportPlatformLedgerUseCase } from '@application/ports/use-cases/platform-finance/export-platform-ledger.use-case.port.ts';
import type { IGetPlatformFinanceSummaryUseCase } from '@application/ports/use-cases/platform-finance/get-platform-finance-summary.use-case.port.ts';
import type { IGetPlatformMasterLedgerUseCase } from '@application/ports/use-cases/platform-finance/get-platform-master-ledger.use-case.port.ts';
import type { IProcessOrderRefundUseCase } from '@application/ports/use-cases/process-order-refund.use-case.port.ts';
import type { IVerifyOrderPaymentUseCase } from '@application/ports/use-cases/verify-order-payment.use-case.port.ts';
import type { IVerifyPaymentUseCase } from '@application/ports/use-cases/verify-payment.use-case.port.ts';
import {
	CreateOrderPaymentUseCase,
	CreateSubscriptionOrderUseCase,
	GetOrderPaymentStatusUseCase,
	GetSubscriptionPlansUseCase,
	GetSubscriptionStatusUseCase,
	HandleWebhookUseCase,
	ProcessOrderRefundUseCase,
	VerifyOrderPaymentUseCase,
	VerifyPaymentUseCase,
} from '@application/use-cases/index.ts';
import { ExportPlatformLedgerUseCase } from '@application/use-cases/platform-finance/export-platform-ledger.use-case.ts';
import { GetPlatformFinanceSummaryUseCase } from '@application/use-cases/platform-finance/get-platform-finance-summary.use-case.ts';
import { GetPlatformMasterLedgerUseCase } from '@application/use-cases/platform-finance/get-platform-master-ledger.use-case.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { ISubscriptionEventProducer } from '@domain/interfaces/subscription-event-producer.interface.ts';
import type { IBillingInvoiceRepository } from '@domain/repositories/billing-invoice.repository.interface.ts';
import type { IFinanceQueryRepository } from '@domain/repositories/finance-query.repository.interface.ts';
import type { IOutboxRepository } from '@domain/repositories/outbox.repository.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { IPlatformLedgerTransactionRepository } from '@domain/repositories/platform-ledger-transaction.repository.interface.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { OutboxRelayService } from '@infrastructure/outbox/outbox-relay.service.ts';
import { RazorpayGateway } from '@infrastructure/payment/razorpay.gateway.ts';
import { SubscriptionEventProducer } from '@infrastructure/queue/subscription-event.producer.ts';
import { RabbitMQService } from '@infrastructure/rabbitmq/index.ts';
import { RedisService } from '@infrastructure/redis/redis.service.ts';
import { PrismaBillingInvoiceRepository } from '@infrastructure/repositories/prisma-billing-invoice.repository.ts';
import { PrismaFinanceQueryRepository } from '@infrastructure/repositories/prisma-finance-query.repository.ts';
import { PrismaOutboxRepository } from '@infrastructure/repositories/prisma-outbox.repository.ts';
import { PrismaPaymentTransactionRepository } from '@infrastructure/repositories/prisma-payment-transaction.repository.ts';
import { PrismaPlatformLedgerTransactionRepository } from '@infrastructure/repositories/prisma-platform-ledger-transaction.repository.ts';
import { PrismaSubscriptionRepository } from '@infrastructure/repositories/prisma-subscription.repository.ts';
import { PrismaSubscriptionPlanRepository } from '@infrastructure/repositories/prisma-subscription-plan.repository.ts';
import { PaymentSubscriptionExpiryService } from '@infrastructure/services/subscription-expiry.service.ts';
import { OrderPaymentController } from '@presentation/controllers/order-payment.controller.ts';
import { PlatformFinanceController } from '@presentation/controllers/platform-finance.controller.ts';
import { SubscriptionController } from '@presentation/controllers/subscription.controller.ts';
import { Container } from 'inversify';
import { TYPES } from './types.ts';

export const container = new Container();

container
	.bind<ISubscriptionRepository>(TYPES.Repositories.SubscriptionRepository)
	.to(PrismaSubscriptionRepository)
	.inSingletonScope();

container
	.bind<ISubscriptionPlanRepository>(TYPES.Repositories.SubscriptionPlanRepository)
	.to(PrismaSubscriptionPlanRepository)
	.inSingletonScope();

container
	.bind<IPaymentTransactionRepository>(TYPES.Repositories.PaymentTransactionRepository)
	.to(PrismaPaymentTransactionRepository)
	.inSingletonScope();

container
	.bind<IBillingInvoiceRepository>(TYPES.Repositories.BillingInvoiceRepository)
	.to(PrismaBillingInvoiceRepository)
	.inSingletonScope();

container
	.bind<IOutboxRepository>(TYPES.Repositories.OutboxRepository)
	.to(PrismaOutboxRepository)
	.inSingletonScope();

container
	.bind<IFinanceQueryRepository>(TYPES.Repositories.FinanceQueryRepository)
	.to(PrismaFinanceQueryRepository)
	.inSingletonScope();

container
	.bind<IPlatformLedgerTransactionRepository>(
		TYPES.Repositories.PlatformLedgerTransactionRepository,
	)
	.to(PrismaPlatformLedgerTransactionRepository)
	.inSingletonScope();

container
	.bind<IPaymentGateway>(TYPES.Gateways.PaymentGateway)
	.to(RazorpayGateway)
	.inSingletonScope();

container
	.bind<IOutboxRelayService>(TYPES.Services.OutboxRelayService)
	.to(OutboxRelayService)
	.inSingletonScope();

container
	.bind<ISubscriptionEventProducer>(TYPES.Services.SubscriptionEventProducer)
	.to(SubscriptionEventProducer)
	.inSingletonScope();

container
	.bind<IPaymentSubscriptionExpiryService>(TYPES.Services.SubscriptionExpiryService)
	.to(PaymentSubscriptionExpiryService)
	.inSingletonScope();

container
	.bind<RabbitMQService>(TYPES.Services.RabbitMQService)
	.to(RabbitMQService)
	.inSingletonScope();

container.bind<ICacheService>(TYPES.Services.CacheService).to(RedisService).inSingletonScope();

container
	.bind<ICreateSubscriptionOrderUseCase>(TYPES.UseCases.CreateSubscriptionOrderUseCase)
	.to(CreateSubscriptionOrderUseCase);

container
	.bind<IGetSubscriptionPlansUseCase>(TYPES.UseCases.GetSubscriptionPlansUseCase)
	.to(GetSubscriptionPlansUseCase);

container
	.bind<IGetSubscriptionStatusUseCase>(TYPES.UseCases.GetSubscriptionStatusUseCase)
	.to(GetSubscriptionStatusUseCase);

container.bind<IHandleWebhookUseCase>(TYPES.UseCases.HandleWebhookUseCase).to(HandleWebhookUseCase);

container.bind<IVerifyPaymentUseCase>(TYPES.UseCases.VerifyPaymentUseCase).to(VerifyPaymentUseCase);

container
	.bind<IGetPlatformFinanceSummaryUseCase>(TYPES.UseCases.GetPlatformFinanceSummaryUseCase)
	.to(GetPlatformFinanceSummaryUseCase);

container
	.bind<IGetPlatformMasterLedgerUseCase>(TYPES.UseCases.GetPlatformMasterLedgerUseCase)
	.to(GetPlatformMasterLedgerUseCase);

container
	.bind<IExportPlatformLedgerUseCase>(TYPES.UseCases.ExportPlatformLedgerUseCase)
	.to(ExportPlatformLedgerUseCase);

container
	.bind<ICreateOrderPaymentUseCase>(TYPES.UseCases.CreateOrderPaymentUseCase)
	.to(CreateOrderPaymentUseCase);

container
	.bind<IVerifyOrderPaymentUseCase>(TYPES.UseCases.VerifyOrderPaymentUseCase)
	.to(VerifyOrderPaymentUseCase);

container
	.bind<IGetOrderPaymentStatusUseCase>(TYPES.UseCases.GetOrderPaymentStatusUseCase)
	.to(GetOrderPaymentStatusUseCase);

container
	.bind<IProcessOrderRefundUseCase>(TYPES.UseCases.ProcessOrderRefundUseCase)
	.to(ProcessOrderRefundUseCase)
	.inSingletonScope();

container
	.bind<SubscriptionController>(TYPES.Controllers.SubscriptionController)
	.to(SubscriptionController)
	.inSingletonScope();

container
	.bind<PlatformFinanceController>(TYPES.Controllers.PlatformFinanceController)
	.to(PlatformFinanceController);
container
	.bind<OrderPaymentController>(TYPES.Controllers.OrderPaymentController)
	.to(OrderPaymentController)
	.inSingletonScope();
