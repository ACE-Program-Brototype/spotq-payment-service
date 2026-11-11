import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import type { CreatePaymentTransactionInput } from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { Prisma, PaymentTransaction as PrismaPaymentTransaction } from '@prisma/client';
import { PAYMENT_STATUS } from '@shared/constants/index.ts';

/**
 * Persistence mapper converting PaymentTransaction domain entities and inputs to and from Prisma records.
 */
export const PaymentTransactionPersistenceMapper = {
	toDomain(record: PrismaPaymentTransaction): PaymentTransaction {
		return new PaymentTransaction({
			id: record.id,
			restaurantId: record.restaurantId,
			subscriptionId: record.subscriptionId,
			planId: record.planId,
			orderId: record.orderId,
			customerId: record.customerId,
			razorpayOrderId: record.razorpayOrderId,
			razorpayPaymentId: record.razorpayPaymentId,
			razorpaySignature: record.razorpaySignature,
			amountPaise: record.amountPaise,
			currency: record.currency,
			status: record.status,
			failureReason: record.failureReason,
			metadata: (record.metadata as Record<string, unknown>) || null,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	},

	toCreatePersistence(
		data: CreatePaymentTransactionInput,
	): Prisma.PaymentTransactionUncheckedCreateInput {
		return {
			restaurantId: data.restaurantId,
			subscriptionId: data.subscriptionId || undefined,
			planId: data.planId,
			orderId: data.orderId,
			customerId: data.customerId,
			razorpayOrderId: data.razorpayOrderId,
			amountPaise: data.amountPaise,
			currency: data.currency,
			status: data.status || PAYMENT_STATUS.CREATED,
			metadata: (data.metadata as unknown as Prisma.InputJsonValue) || undefined,
		};
	},
};
