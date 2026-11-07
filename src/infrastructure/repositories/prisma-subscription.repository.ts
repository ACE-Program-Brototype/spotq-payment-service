import { Subscription } from '@domain/entities/subscription.entity.ts';
import type {
	ActivateSubscriptionWithOutboxParams,
	CreateSubscriptionInput,
	ISubscriptionRepository,
	RenewSubscriptionWithOutboxParams,
} from '@domain/repositories/subscription.repository.interface.ts';
import type {
	PaginatedSubscribersResult,
	SubscriberDetail,
	SubscriberFilterParams,
} from '@domain/types/subscriber-query.types.ts';
import { InvoiceNumber } from '@domain/value-objects/index.ts';
import { SubscriptionPersistenceMapper } from '@infrastructure/mappers/subscription.persistence-mapper.ts';
import type { Prisma, SubscriptionStatus } from '@prisma/client';
import {
	INVOICE_STATUS,
	OUTBOX_STATUS,
	PAYMENT_STATUS,
	UUID_REGEX,
} from '@shared/constants/index.ts';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaSubscriptionRepository
	extends PrismaBaseRepository
	implements ISubscriptionRepository
{
	async findActiveByRestaurantId(restaurantId: string): Promise<Subscription | null> {
		const now = new Date();
		const record = await this.prisma.subscription.findFirst({
			where: {
				restaurantId,
				status: 'ACTIVE',
				currentPeriodEnd: { gte: now },
			},
			orderBy: { currentPeriodEnd: 'desc' },
		});

		if (!record) return null;

		return new Subscription({
			id: record.id,
			restaurantId: record.restaurantId,
			planId: record.planId,
			status: record.status,
			currentPeriodStart: record.currentPeriodStart,
			currentPeriodEnd: record.currentPeriodEnd,
			canceledAt: record.canceledAt,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	}

	async findById(id: string): Promise<Subscription | null> {
		const record = await this.prisma.subscription.findUnique({
			where: { id },
		});

		if (!record) return null;

		return new Subscription({
			id: record.id,
			restaurantId: record.restaurantId,
			planId: record.planId,
			status: record.status,
			currentPeriodStart: record.currentPeriodStart,
			currentPeriodEnd: record.currentPeriodEnd,
			canceledAt: record.canceledAt,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	}

	async create(data: CreateSubscriptionInput): Promise<Subscription> {
		const record = await this.prisma.subscription.create({
			data: {
				restaurantId: data.restaurantId,
				planId: data.planId,
				status: data.status,
				currentPeriodStart: data.currentPeriodStart,
				currentPeriodEnd: data.currentPeriodEnd,
			},
		});

		return new Subscription({
			id: record.id,
			restaurantId: record.restaurantId,
			planId: record.planId,
			status: record.status,
			currentPeriodStart: record.currentPeriodStart,
			currentPeriodEnd: record.currentPeriodEnd,
			canceledAt: record.canceledAt,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		});
	}

	async activateSubscriptionWithOutbox(
		params: ActivateSubscriptionWithOutboxParams,
	): Promise<Subscription> {
		return this.prisma.$transaction(async (tx) => {
			const existingTx = await tx.paymentTransaction.findUnique({
				where: { razorpayOrderId: params.payment.razorpayOrderId },
			});

			if (existingTx?.status === PAYMENT_STATUS.SUCCESS && existingTx.subscriptionId) {
				const existingSub = await tx.subscription.findUnique({
					where: { id: existingTx.subscriptionId },
				});
				if (existingSub) {
					return new Subscription({
						id: existingSub.id,
						restaurantId: existingSub.restaurantId,
						planId: existingSub.planId,
						status: existingSub.status,
						currentPeriodStart: existingSub.currentPeriodStart,
						currentPeriodEnd: existingSub.currentPeriodEnd,
						canceledAt: existingSub.canceledAt,
						createdAt: existingSub.createdAt,
						updatedAt: existingSub.updatedAt,
					});
				}
			}

			const updateResult = await tx.paymentTransaction.updateMany({
				where: {
					razorpayOrderId: params.payment.razorpayOrderId,
					status: { not: PAYMENT_STATUS.SUCCESS },
				},
				data: {
					status: PAYMENT_STATUS.SUCCESS,
					razorpayPaymentId: params.payment.razorpayPaymentId,
					razorpaySignature: params.payment.razorpaySignature,
				},
			});

			if (updateResult.count === 0) {
				const updatedTx = await tx.paymentTransaction.findUnique({
					where: { razorpayOrderId: params.payment.razorpayOrderId },
				});
				if (updatedTx?.subscriptionId) {
					const existingSub = await tx.subscription.findUnique({
						where: { id: updatedTx.subscriptionId },
					});
					if (existingSub) {
						return new Subscription({
							id: existingSub.id,
							restaurantId: existingSub.restaurantId,
							planId: existingSub.planId,
							status: existingSub.status,
							currentPeriodStart: existingSub.currentPeriodStart,
							currentPeriodEnd: existingSub.currentPeriodEnd,
							canceledAt: existingSub.canceledAt,
							createdAt: existingSub.createdAt,
							updatedAt: existingSub.updatedAt,
						});
					}
				}
			}

			const subRecord = await tx.subscription.create({
				data: {
					restaurantId: params.subscription.restaurantId,
					planId: params.subscription.planId,
					status: params.subscription.status,
					currentPeriodStart: params.subscription.currentPeriodStart,
					currentPeriodEnd: params.subscription.currentPeriodEnd,
				},
			});

			await tx.paymentTransaction.update({
				where: { razorpayOrderId: params.payment.razorpayOrderId },
				data: {
					subscriptionId: subRecord.id,
				},
			});

			const existingInvoice = await tx.billingInvoice.findFirst({
				where: { paymentTransactionId: existingTx?.id },
			});

			if (existingInvoice) {
				await tx.billingInvoice.update({
					where: { id: existingInvoice.id },
					data: {
						subscriptionId: subRecord.id,
						status: INVOICE_STATUS.PAID,
						paidAt: new Date(),
					},
				});
			} else if (existingTx) {
				await tx.billingInvoice.create({
					data: {
						restaurantId: params.subscription.restaurantId,
						subscriptionId: subRecord.id,
						paymentTransactionId: existingTx.id,
						invoiceNumber: InvoiceNumber.generate(),
						amountPaise: existingTx.amountPaise,
						currency: existingTx.currency,
						status: INVOICE_STATUS.PAID,
						paidAt: new Date(),
					},
				});
			}

			await tx.outboxEvent.create({
				data: {
					eventType: params.outbox.eventType,
					aggregateId: params.outbox.aggregateId,
					payload: {
						...params.outbox.payload,
						subscriptionId: subRecord.id,
					},
					status: 'PENDING',
				},
			});

			return new Subscription({
				id: subRecord.id,
				restaurantId: subRecord.restaurantId,
				planId: subRecord.planId,
				status: subRecord.status,
				currentPeriodStart: subRecord.currentPeriodStart,
				currentPeriodEnd: subRecord.currentPeriodEnd,
				canceledAt: subRecord.canceledAt,
				createdAt: subRecord.createdAt,
				updatedAt: subRecord.updatedAt,
			});
		});
	}

	async renewSubscriptionWithOutbox(
		params: RenewSubscriptionWithOutboxParams,
	): Promise<Subscription> {
		return this.prisma.$transaction(async (tx) => {
			const existingTx = await tx.paymentTransaction.findUnique({
				where: { razorpayOrderId: params.payment.razorpayOrderId },
			});

			if (existingTx?.status === PAYMENT_STATUS.SUCCESS && existingTx.subscriptionId) {
				const existingSub = await tx.subscription.findUnique({
					where: { id: existingTx.subscriptionId },
				});
				if (existingSub) {
					return SubscriptionPersistenceMapper.toDomain(existingSub);
				}
			}

			const updateResult = await tx.paymentTransaction.updateMany({
				where: {
					razorpayOrderId: params.payment.razorpayOrderId,
					status: { not: PAYMENT_STATUS.SUCCESS },
				},
				data: {
					status: PAYMENT_STATUS.SUCCESS,
					razorpayPaymentId: params.payment.razorpayPaymentId,
					razorpaySignature: params.payment.razorpaySignature,
					subscriptionId: params.subscription.subscriptionId,
				},
			});

			if (updateResult.count === 0) {
				const concurrentSub = await tx.subscription.findUnique({
					where: { id: params.subscription.subscriptionId },
				});
				if (concurrentSub) {
					return SubscriptionPersistenceMapper.toDomain(concurrentSub);
				}
			}

			const subRecord = await tx.subscription.update({
				where: { id: params.subscription.subscriptionId },
				data: {
					planId: params.subscription.planId,
					status: params.subscription.status,
					currentPeriodStart: params.subscription.currentPeriodStart,
					currentPeriodEnd: params.subscription.currentPeriodEnd,
					canceledAt: null,
				},
			});

			const existingInvoice = await tx.billingInvoice.findFirst({
				where: { paymentTransactionId: existingTx?.id },
			});

			if (existingInvoice) {
				await tx.billingInvoice.update({
					where: { id: existingInvoice.id },
					data: {
						subscriptionId: subRecord.id,
						status: INVOICE_STATUS.PAID,
						paidAt: new Date(),
					},
				});
			} else if (existingTx) {
				await tx.billingInvoice.create({
					data: {
						restaurantId: params.subscription.restaurantId,
						subscriptionId: subRecord.id,
						paymentTransactionId: existingTx.id,
						invoiceNumber: InvoiceNumber.generate(),
						amountPaise: existingTx.amountPaise,
						currency: existingTx.currency,
						status: INVOICE_STATUS.PAID,
						paidAt: new Date(),
					},
				});
			}

			await tx.outboxEvent.create({
				data: {
					eventType: params.outbox.eventType,
					aggregateId: params.outbox.aggregateId,
					payload: {
						...params.outbox.payload,
						subscriptionId: subRecord.id,
					},
					status: OUTBOX_STATUS.PENDING,
				},
			});

			return SubscriptionPersistenceMapper.toDomain(subRecord);
		});
	}

	async findSubscribersPaginated(
		params: SubscriberFilterParams,
	): Promise<PaginatedSubscribersResult> {
		const where: Prisma.SubscriptionWhereInput = {};

		if (params.status && params.status !== 'ALL') {
			where.status = params.status as SubscriptionStatus;
		}

		if (params.search) {
			const searchTerm = params.search.trim();
			const isUuid = UUID_REGEX.test(searchTerm);

			if (isUuid) {
				where.OR = [
					{ id: searchTerm },
					{ restaurantId: searchTerm },
					{ plan: { name: { contains: searchTerm, mode: 'insensitive' } } },
					{ plan: { code: { contains: searchTerm, mode: 'insensitive' } } },
				];
			} else {
				where.OR = [
					{ plan: { name: { contains: searchTerm, mode: 'insensitive' } } },
					{ plan: { code: { contains: searchTerm, mode: 'insensitive' } } },
				];
			}
		}

		const sortField = params.sortBy || 'createdAt';
		const sortOrder = params.sortOrder || 'desc';
		const orderBy: Prisma.SubscriptionOrderByWithRelationInput = {
			[sortField]: sortOrder,
		};

		const page = Math.max(1, params.page || 1);
		const limit = Math.max(1, Math.min(100, params.limit || 10));
		const skip = (page - 1) * limit;

		const [totalItems, records] = await Promise.all([
			this.prisma.subscription.count({ where }),
			this.prisma.subscription.findMany({
				where,
				orderBy,
				skip,
				take: limit,
				include: {
					plan: true,
				},
			}),
		]);

		const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

		return {
			subscribers: records.map((record) => ({
				id: record.id,
				restaurantId: record.restaurantId,
				planId: record.planId,
				status: record.status,
				currentPeriodStart: record.currentPeriodStart,
				currentPeriodEnd: record.currentPeriodEnd,
				canceledAt: record.canceledAt,
				createdAt: record.createdAt,
				updatedAt: record.updatedAt,
				plan: {
					id: record.plan.id,
					code: record.plan.code,
					name: record.plan.name,
					description: record.plan.description,
					pricePaise: record.plan.pricePaise,
					currency: record.plan.currency,
					billingCycle: record.plan.billingCycle,
					features: record.plan.features,
					isActive: record.plan.isActive,
				},
			})),
			pagination: {
				page,
				limit,
				totalItems,
				totalPages,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1,
			},
		};
	}

	async findSubscriberDetailById(subscriberId: string): Promise<SubscriberDetail | null> {
		const isUuid = UUID_REGEX.test(subscriberId);
		if (!isUuid) {
			return null;
		}

		const record = await this.prisma.subscription.findFirst({
			where: {
				OR: [{ id: subscriberId }, { restaurantId: subscriberId }],
			},
			include: {
				plan: true,
				paymentTransactions: {
					orderBy: { createdAt: 'desc' },
					take: 10,
				},
				invoices: {
					orderBy: { createdAt: 'desc' },
					take: 10,
				},
			},
		});

		if (!record) {
			return null;
		}

		return {
			id: record.id,
			restaurantId: record.restaurantId,
			planId: record.planId,
			status: record.status,
			currentPeriodStart: record.currentPeriodStart,
			currentPeriodEnd: record.currentPeriodEnd,
			canceledAt: record.canceledAt,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
			plan: {
				id: record.plan.id,
				code: record.plan.code,
				name: record.plan.name,
				description: record.plan.description,
				pricePaise: record.plan.pricePaise,
				currency: record.plan.currency,
				billingCycle: record.plan.billingCycle,
				features: record.plan.features,
				isActive: record.plan.isActive,
			},
			transactions: record.paymentTransactions.map((tx) => ({
				id: tx.id,
				amountPaise: tx.amountPaise,
				currency: tx.currency,
				status: tx.status,
				razorpayOrderId: tx.razorpayOrderId,
				razorpayPaymentId: tx.razorpayPaymentId,
				createdAt: tx.createdAt,
			})),
			invoices: record.invoices.map((inv) => ({
				id: inv.id,
				invoiceNumber: inv.invoiceNumber,
				amountPaise: inv.amountPaise,
				currency: inv.currency,
				status: inv.status,
				paidAt: inv.paidAt,
				createdAt: inv.createdAt,
			})),
		};
	}
}
