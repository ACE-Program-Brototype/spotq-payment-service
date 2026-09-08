// Services
import type { IOutboxRelayService } from '@application/ports/services/outbox-relay.service.port.ts';
import type { IPaymentSubscriptionExpiryService } from '@application/ports/services/subscription-expiry.service.port.ts';
// Use Cases
import type { ICreateSubscriptionOrderUseCase } from '@application/ports/use-cases/create-subscription-order.use-case.port.ts';
import type { IGetSubscriptionPlansUseCase } from '@application/ports/use-cases/get-subscription-plans.use-case.port.ts';
import type { IGetSubscriptionStatusUseCase } from '@application/ports/use-cases/get-subscription-status.use-case.port.ts';
import type { IHandleWebhookUseCase } from '@application/ports/use-cases/handle-webhook.use-case.port.ts';
import type { IVerifyPaymentUseCase } from '@application/ports/use-cases/verify-payment.use-case.port.ts';
import { CreateSubscriptionOrderUseCase } from '@application/use-cases/create-subscription-order.use-case.ts';
import { GetSubscriptionPlansUseCase } from '@application/use-cases/get-subscription-plans.use-case.ts';
import { GetSubscriptionStatusUseCase } from '@application/use-cases/get-subscription-status.use-case.ts';
import { HandleWebhookUseCase } from '@application/use-cases/handle-webhook.use-case.ts';
import { VerifyPaymentUseCase } from '@application/use-cases/verify-payment.use-case.ts';
// Gateways & Interfaces
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { ISubscriptionEventProducer } from '@domain/interfaces/subscription-event-producer.interface.ts';
import type { IOutboxRepository } from '@domain/repositories/outbox.repository.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
// Repositories
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import type { ISubscriptionPlanRepository } from '@domain/repositories/subscription-plan.repository.interface.ts';
import { OutboxRelayService } from '@infrastructure/outbox/outbox-relay.service.ts';
import { RazorpayGateway } from '@infrastructure/payment/razorpay.gateway.ts';
import { SubscriptionEventProducer } from '@infrastructure/queue/subscription-event.producer.ts';
import { PrismaOutboxRepository } from '@infrastructure/repositories/prisma-outbox.repository.ts';
import { PrismaPaymentTransactionRepository } from '@infrastructure/repositories/prisma-payment-transaction.repository.ts';
import { PrismaSubscriptionRepository } from '@infrastructure/repositories/prisma-subscription.repository.ts';
import { PrismaSubscriptionPlanRepository } from '@infrastructure/repositories/prisma-subscription-plan.repository.ts';
import { PaymentSubscriptionExpiryService } from '@infrastructure/services/subscription-expiry.service.ts';
// Controllers
import { SubscriptionController } from '@presentation/controllers/subscription.controller.ts';
import { Container } from 'inversify';
import { TYPES } from './types.ts';

export const container = new Container();

// Repository Bindings
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
	.bind<IOutboxRepository>(TYPES.Repositories.OutboxRepository)
	.to(PrismaOutboxRepository)
	.inSingletonScope();

// Gateway Bindings
container
	.bind<IPaymentGateway>(TYPES.Gateways.PaymentGateway)
	.to(RazorpayGateway)
	.inSingletonScope();

// Service Bindings
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

// Use Case Bindings
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

// Controller Bindings
container
	.bind<SubscriptionController>(TYPES.Controllers.SubscriptionController)
	.to(SubscriptionController)
	.inSingletonScope();
