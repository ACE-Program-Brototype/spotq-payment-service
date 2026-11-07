import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import { PaymentOrderNotFoundError } from '@domain/errors/payment.errors.ts';
import type {
	CaptureOrderPaymentWithOutboxParams,
	CreatePaymentTransactionInput,
	FailOrderPaymentWithOutboxParams,
	IPaymentTransactionRepository,
} from '@domain/repositories/payment-transaction.repository.interface.ts';
import type { Prisma, PaymentTransaction as PrismaPaymentTransaction } from '@prisma/client';
import {
	OUTBOX_STATUS,
	PAYMENT_STATUS,
	PENDING_ORDER_REUSE_WINDOW_MS,
} from '@shared/constants/index.ts';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaPaymentTransactionRepository
	extends PrismaBaseRepository
	implements IPaymentTransactionRepository
{
	private mapToDomain(record: PrismaPaymentTransaction): PaymentTransaction {
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
	}

	async findByOrderId(razorpayOrderId: string): Promise<PaymentTransaction | null> {
		const record = await this.prisma.paymentTransaction.findUnique({
			where: { razorpayOrderId },
		});

		if (!record) return null;
		return this.mapToDomain(record);
	}

	async findByCustomerOrderId(orderId: string): Promise<PaymentTransaction | null> {
		const record = await this.prisma.paymentTransaction.findFirst({
			where: { orderId },
			orderBy: { createdAt: 'desc' },
		});

		if (!record) return null;
		return this.mapToDomain(record);
	}

	async findByPaymentId(razorpayPaymentId: string): Promise<PaymentTransaction | null> {
		const record = await this.prisma.paymentTransaction.findUnique({
			where: { razorpayPaymentId },
		});

		if (!record) return null;
		return this.mapToDomain(record);
	}

	async findPendingByRestaurantAndPlan(
		restaurantId: string,
		planId: string,
	): Promise<PaymentTransaction | null> {
		const reusableWindowStart = new Date(Date.now() - PENDING_ORDER_REUSE_WINDOW_MS);

		const record = await this.prisma.paymentTransaction.findFirst({
			where: {
				restaurantId,
				planId,
				subscriptionId: null,
				status: { in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.FAILED] },
				createdAt: { gte: reusableWindowStart },
			},
			orderBy: { createdAt: 'desc' },
		});

		if (!record) return null;
		return this.mapToDomain(record);
	}

	async findPendingRenewalBySubscriptionAndPlan(
		subscriptionId: string,
		planId: string,
	): Promise<PaymentTransaction | null> {
		const reusableWindowStart = new Date(Date.now() - PENDING_ORDER_REUSE_WINDOW_MS);

		const record = await this.prisma.paymentTransaction.findFirst({
			where: {
				subscriptionId,
				planId,
				status: { in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.FAILED] },
				createdAt: { gte: reusableWindowStart },
			},
			orderBy: { createdAt: 'desc' },
		});

		if (!record) return null;
		return this.mapToDomain(record);
	}

	async create(data: CreatePaymentTransactionInput): Promise<PaymentTransaction> {
		const record = await this.prisma.paymentTransaction.create({
			data: {
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
			},
		});

		return this.mapToDomain(record);
	}

	async captureOrderPaymentWithOutbox(
		params: CaptureOrderPaymentWithOutboxParams,
	): Promise<PaymentTransaction> {
		return await this.prisma.$transaction(async (tx) => {
			const existing = await tx.paymentTransaction.findUnique({
				where: { id: params.transaction.id },
			});

			if (!existing) {
				throw new PaymentOrderNotFoundError();
			}

			if (existing.status === PAYMENT_STATUS.CAPTURED) {
				return this.mapToDomain(existing);
			}

			const updated = await tx.paymentTransaction.update({
				where: { id: params.transaction.id },
				data: {
					status: params.transaction.status,
					razorpayPaymentId: params.transaction.razorpayPaymentId,
					...(params.transaction.razorpaySignature
						? { razorpaySignature: params.transaction.razorpaySignature }
						: {}),
					...(params.transaction.metadata
						? { metadata: params.transaction.metadata as Prisma.InputJsonValue }
						: {}),
					updatedAt: params.transaction.updatedAt ?? new Date(),
				},
			});

			await tx.outboxEvent.create({
				data: {
					eventType: params.outbox.eventType,
					aggregateId: params.outbox.aggregateId,
					payload: params.outbox.payload as unknown as Prisma.InputJsonValue,
					status: OUTBOX_STATUS.PENDING,
				},
			});

			return this.mapToDomain(updated);
		});
	}

	async failOrderPaymentWithOutbox(
		params: FailOrderPaymentWithOutboxParams,
	): Promise<PaymentTransaction> {
		return await this.prisma.$transaction(async (tx) => {
			const existing = await tx.paymentTransaction.findUnique({
				where: { id: params.transaction.id },
			});

			if (!existing) {
				throw new PaymentOrderNotFoundError();
			}

			if (
				existing.status === PAYMENT_STATUS.CAPTURED ||
				existing.status === PAYMENT_STATUS.SUCCESS ||
				existing.status === PAYMENT_STATUS.FAILED
			) {
				return this.mapToDomain(existing);
			}

			const updated = await tx.paymentTransaction.update({
				where: { id: params.transaction.id },
				data: {
					status: params.transaction.status,
					failureReason: params.transaction.failureReason,
					updatedAt: params.transaction.updatedAt ?? new Date(),
				},
			});

			await tx.outboxEvent.create({
				data: {
					eventType: params.outbox.eventType,
					aggregateId: params.outbox.aggregateId,
					payload: params.outbox.payload as unknown as Prisma.InputJsonValue,
					status: OUTBOX_STATUS.PENDING,
				},
			});

			return this.mapToDomain(updated);
		});
	}

	async markSuccess(params: {
		razorpayOrderId: string;
		razorpayPaymentId: string;
		razorpaySignature: string;
		subscriptionId: string;
	}): Promise<PaymentTransaction> {
		const record = await this.prisma.paymentTransaction.update({
			where: { razorpayOrderId: params.razorpayOrderId },
			data: {
				status: PAYMENT_STATUS.SUCCESS,
				razorpayPaymentId: params.razorpayPaymentId,
				razorpaySignature: params.razorpaySignature,
				subscriptionId: params.subscriptionId,
			},
		});

		return this.mapToDomain(record);
	}

	async markFailed(razorpayOrderId: string, failureReason: string): Promise<PaymentTransaction> {
		const record = await this.prisma.paymentTransaction.update({
			where: { razorpayOrderId },
			data: {
				status: PAYMENT_STATUS.FAILED,
				failureReason,
			},
		});

		return this.mapToDomain(record);
	}

	async resetToCreated(razorpayOrderId: string): Promise<PaymentTransaction> {
		const record = await this.prisma.paymentTransaction.update({
			where: { razorpayOrderId },
			data: {
				status: PAYMENT_STATUS.CREATED,
				failureReason: null,
			},
		});

		return this.mapToDomain(record);
	}
}
