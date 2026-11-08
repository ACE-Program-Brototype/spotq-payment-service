import { PaymentRefund } from '@domain/entities/payment-refund.entity.ts';
import type { PaymentRefund as PrismaPaymentRefund } from '@prisma/client';

export const PaymentRefundPersistenceMapper = {
	toDomain(record: PrismaPaymentRefund): PaymentRefund {
		return new PaymentRefund({
			id: record.id,
			paymentTransactionId: record.paymentTransactionId,
			razorpayRefundId: record.razorpayRefundId,
			amountPaise: record.amountPaise,
			currency: record.currency,
			status: record.status,
			reason: record.reason,
			arn: record.arn,
			paymentMethod: record.paymentMethod,
			destination: record.destination,
			createdAt: record.createdAt,
			processedAt: record.processedAt,
		});
	},
};
