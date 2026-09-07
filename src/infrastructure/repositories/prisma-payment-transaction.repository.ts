import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import type {
	CreatePaymentTransactionInput,
	IPaymentTransactionRepository,
} from '@domain/repositories/payment-transaction.repository.interface.ts';
import { prisma } from '@infrastructure/database/prisma.ts';
import type { Prisma } from '@prisma/client';

export class PrismaPaymentTransactionRepository implements IPaymentTransactionRepository {
	async findByOrderId(razorpayOrderId: string): Promise<PaymentTransaction | null> {
		const record = await prisma.paymentTransaction.findUnique({
			where: { razorpayOrderId },
		});

		if (!record) return null;

		return new PaymentTransaction({
			id: record.id,
			restaurantId: record.restaurantId,
			subscriptionId: record.subscriptionId,
			planId: record.planId,
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
	}

	async findByPaymentId(razorpayPaymentId: string): Promise<PaymentTransaction | null> {
		const record = await prisma.paymentTransaction.findUnique({
			where: { razorpayPaymentId },
		});

		if (!record) return null;

		return new PaymentTransaction({
			id: record.id,
			restaurantId: record.restaurantId,
			subscriptionId: record.subscriptionId,
			planId: record.planId,
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
	}

	async findPendingByRestaurantAndPlan(
		restaurantId: string,
		planId: string,
	): Promise<PaymentTransaction | null> {
		// Valid for 15 minutes
		const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

		const record = await prisma.paymentTransaction.findFirst({
			where: {
				restaurantId,
				planId,
				status: 'CREATED',
				createdAt: { gte: fifteenMinutesAgo },
			},
			orderBy: { createdAt: 'desc' },
		});

		if (!record) return null;

		return new PaymentTransaction({
			id: record.id,
			restaurantId: record.restaurantId,
			subscriptionId: record.subscriptionId,
			planId: record.planId,
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
	}

	async create(data: CreatePaymentTransactionInput): Promise<PaymentTransaction> {
		const record = await prisma.paymentTransaction.create({
			data: {
				restaurantId: data.restaurantId,
				planId: data.planId,
				razorpayOrderId: data.razorpayOrderId,
				amountPaise: data.amountPaise,
				currency: data.currency,
				status: data.status || 'CREATED',
				metadata: (data.metadata as unknown as Prisma.InputJsonValue) || undefined,
			},
		});

		return new PaymentTransaction({
			id: record.id,
			restaurantId: record.restaurantId,
			subscriptionId: record.subscriptionId,
			planId: record.planId,
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
	}

	async markSuccess(params: {
		razorpayOrderId: string;
		razorpayPaymentId: string;
		razorpaySignature: string;
		subscriptionId: string;
	}): Promise<PaymentTransaction> {
		const record = await prisma.paymentTransaction.update({
			where: { razorpayOrderId: params.razorpayOrderId },
			data: {
				status: 'SUCCESS',
				razorpayPaymentId: params.razorpayPaymentId,
				razorpaySignature: params.razorpaySignature,
				subscriptionId: params.subscriptionId,
			},
		});

		return new PaymentTransaction({
			id: record.id,
			restaurantId: record.restaurantId,
			subscriptionId: record.subscriptionId,
			planId: record.planId,
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
	}

	async markFailed(razorpayOrderId: string, failureReason: string): Promise<PaymentTransaction> {
		const record = await prisma.paymentTransaction.update({
			where: { razorpayOrderId },
			data: {
				status: 'FAILED',
				failureReason,
			},
		});

		return new PaymentTransaction({
			id: record.id,
			restaurantId: record.restaurantId,
			subscriptionId: record.subscriptionId,
			planId: record.planId,
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
	}
}

export const paymentTransactionRepository = new PrismaPaymentTransactionRepository();
