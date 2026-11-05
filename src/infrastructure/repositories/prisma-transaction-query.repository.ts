import type { ITransactionQueryRepository } from '@domain/repositories/transaction-query.repository.interface.ts';
import type {
	CustomerContext,
	CustomerRefundSummary,
	CustomerTransactionFilterParams,
	CustomerTransactionRecord,
	PaginatedCustomerTransactionsResult,
	PaginatedTransactionsResult,
	RefundDetail,
	TransactionDetail,
	TransactionFilterParams,
	TransactionSummary,
} from '@domain/types/transaction-query.types.ts';
import type { PaymentStatus, Prisma } from '@prisma/client';
import {
	buildTransactionInvoiceUrl,
	DEFAULT_PAYMENT_METHOD,
	PAGINATION,
	PAYMENT_SORT_FIELDS,
	PAYMENT_STATUS,
	PENDING_ORDER_REUSE_WINDOW_MS,
	SORT_DIRECTIONS,
} from '@shared/constants/index.ts';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

/**
 * Note on Metadata Contract:
 * Customer dining snapshot metadata (orderNumber, customerName, billingBreakdown, settlement)
 * is populated by order payment webhook flows. Real transactions created without this metadata
 * will gracefully fallback to safe default values or nulls (e.g. customer name as null,
 * billing subtotal/grandTotal as record.amountPaise, and settlement status as PENDING_EOD).
 */
interface TransactionMetadata {
	orderNumber?: string;
	customerName?: string;
	customerPhoneMasked?: string;
	tableNumber?: string;
	tokenNumber?: string;
	paymentMethod?: string;
	method?: string;
	upiVpa?: string;
	card?: Record<string, unknown>;
	bankReference?: string;
	billingBreakdown?: {
		subtotalPaise?: number;
		gstPaise?: number;
		discountPaise?: number;
		grandTotalPaise?: number;
	};
	settlement?: {
		status?: string;
		settlementId?: string | null;
		scheduledPayout?: string | null;
	};
}

@injectable()
export class PrismaTransactionQueryRepository
	extends PrismaBaseRepository
	implements ITransactionQueryRepository
{
	async findTransactionsByRestaurant(
		params: TransactionFilterParams,
	): Promise<PaginatedTransactionsResult> {
		const where: Prisma.PaymentTransactionWhereInput = {
			restaurantId: params.restaurantId,
		};

		if (params.status && params.status !== 'ALL') {
			where.status = params.status as PaymentStatus;
		}

		if (params.minAmount !== null && params.minAmount !== undefined) {
			where.amountPaise = {
				...(where.amountPaise as Prisma.IntFilter),
				gte: params.minAmount,
			};
		}

		if (params.maxAmount !== null && params.maxAmount !== undefined) {
			where.amountPaise = {
				...(where.amountPaise as Prisma.IntFilter),
				lte: params.maxAmount,
			};
		}

		if (params.startDate) {
			const startDateTime = new Date(`${params.startDate}T00:00:00.000Z`);
			where.createdAt = {
				...(where.createdAt as Prisma.DateTimeFilter),
				gte: startDateTime,
			};
		}

		if (params.endDate) {
			const endDateTime = new Date(`${params.endDate}T23:59:59.999Z`);
			where.createdAt = {
				...(where.createdAt as Prisma.DateTimeFilter),
				lte: endDateTime,
			};
		}

		if (params.method && params.method !== 'ALL') {
			where.metadata = {
				path: ['paymentMethod'],
				equals: params.method,
			};
		}

		if (params.search && params.search.trim().length > 0) {
			const searchTerm = params.search.trim();
			const searchPattern = `%${searchTerm}%`;

			try {
				const matchingRecords = await this.prisma.$queryRaw<{ id: string }[]>`
					SELECT id FROM "payment_transactions"
					WHERE "restaurant_id" = ${params.restaurantId}::uuid
					AND (
						"razorpay_payment_id" ILIKE ${searchPattern}
						OR "razorpay_order_id" ILIKE ${searchPattern}
						OR "metadata"->>'orderNumber' ILIKE ${searchPattern}
						OR "metadata"->>'customerName' ILIKE ${searchPattern}
					)
				`;
				const matchedIds = matchingRecords.map((r) => r.id);
				where.id = { in: matchedIds };
			} catch {
				where.OR = [
					{
						razorpayPaymentId: {
							contains: searchTerm,
							mode: 'insensitive',
						},
					},
					{
						metadata: {
							path: ['orderNumber'],
							string_contains: searchTerm,
						},
					},
					{
						metadata: {
							path: ['customerName'],
							string_contains: searchTerm,
						},
					},
				];
			}
		}

		const sortByField =
			params.sortBy === PAYMENT_SORT_FIELDS.AMOUNT_PAISE
				? PAYMENT_SORT_FIELDS.AMOUNT_PAISE
				: PAYMENT_SORT_FIELDS.CREATED_AT;
		const sortOrderDirection: Prisma.SortOrder =
			params.sortOrder === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.ASC : SORT_DIRECTIONS.DESC;

		const page = Math.max(1, params.page);
		const limit = Math.max(1, params.limit);
		const skip = (page - 1) * limit;

		const [totalRecords, records] = await this.prisma.$transaction([
			this.prisma.paymentTransaction.count({ where }),
			this.prisma.paymentTransaction.findMany({
				where,
				orderBy: {
					[sortByField]: sortOrderDirection,
				},
				skip,
				take: limit,
			}),
		]);

		const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

		const transactions: TransactionSummary[] = records.map((record) => {
			const meta = (record.metadata as TransactionMetadata) || {};
			const settlementStatus = meta.settlement?.status || 'PENDING_EOD';
			const paymentMethod = (
				meta.paymentMethod ||
				meta.method ||
				DEFAULT_PAYMENT_METHOD
			).toUpperCase();

			return {
				id: record.id,
				orderId: record.orderId,
				orderNumber: meta.orderNumber || null,
				customerName: meta.customerName || null,
				razorpayPaymentId: record.razorpayPaymentId,
				paymentMethod,
				amountPaise: record.amountPaise,
				status: record.status,
				settlementStatus,
				createdAt: record.createdAt,
			};
		});

		return {
			transactions,
			pagination: {
				currentPage: page,
				totalPages,
				totalRecords,
				limit,
			},
		};
	}

	async findTransactionById(id: string, restaurantId: string): Promise<TransactionDetail | null> {
		const record = await this.prisma.paymentTransaction.findFirst({
			where: {
				id,
				restaurantId,
			},
			include: {
				refunds: {
					orderBy: {
						createdAt: 'desc',
					},
					take: 1,
				},
			},
		});

		if (!record) {
			return null;
		}

		const meta = (record.metadata as TransactionMetadata) || {};

		const customer: CustomerContext = {
			name: meta.customerName || null,
			phoneMasked: meta.customerPhoneMasked || null,
			tableNumber: meta.tableNumber || null,
			tokenNumber: meta.tokenNumber || null,
		};

		const billingBreakdown = {
			subtotalPaise: meta.billingBreakdown?.subtotalPaise ?? record.amountPaise,
			gstPaise: meta.billingBreakdown?.gstPaise ?? 0,
			discountPaise: meta.billingBreakdown?.discountPaise ?? 0,
			grandTotalPaise: meta.billingBreakdown?.grandTotalPaise ?? record.amountPaise,
		};

		const settlement = {
			status: meta.settlement?.status || 'PENDING_EOD',
			settlementId: meta.settlement?.settlementId || null,
			scheduledPayout: meta.settlement?.scheduledPayout || null,
		};

		let refund: RefundDetail | null = null;
		if (record.refunds && record.refunds.length > 0) {
			const firstRefund = record.refunds[0];
			refund = {
				id: firstRefund.id,
				razorpayRefundId: firstRefund.razorpayRefundId,
				amountPaise: firstRefund.amountPaise,
				currency: firstRefund.currency,
				status: firstRefund.status,
				reason: firstRefund.reason,
				processedAt: firstRefund.processedAt,
				createdAt: firstRefund.createdAt,
			};
		}

		return {
			id: record.id,
			restaurantId: record.restaurantId,
			orderId: record.orderId,
			orderNumber: meta.orderNumber || null,
			customer,
			amountPaise: record.amountPaise,
			currency: record.currency,
			status: record.status,
			paymentMethod: (meta.paymentMethod || meta.method || DEFAULT_PAYMENT_METHOD).toUpperCase(),
			upiVpa: meta.upiVpa || null,
			card: meta.card || null,
			razorpayPaymentId: record.razorpayPaymentId,
			razorpayOrderId: record.razorpayOrderId,
			bankReference: meta.bankReference || null,
			billingBreakdown,
			settlement,
			refund,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		};
	}

	private buildCustomerWhere(
		params: CustomerTransactionFilterParams,
	): Prisma.PaymentTransactionWhereInput {
		const where: Prisma.PaymentTransactionWhereInput = {
			customerId: params.customerId,
		};

		if (params.status && params.status !== 'ALL') {
			where.status = params.status as PaymentStatus;
		}

		if (params.startDate || params.endDate) {
			where.createdAt = {};
			if (params.startDate) {
				where.createdAt.gte = new Date(`${params.startDate}T00:00:00.000Z`);
			}
			if (params.endDate) {
				where.createdAt.lte = new Date(`${params.endDate}T23:59:59.999Z`);
			}
		}

		return where;
	}

	private isWithinRetryWindow(createdAt: Date, now: number): boolean {
		return now - createdAt.getTime() < PENDING_ORDER_REUSE_WINDOW_MS;
	}

	private async resolveCapturedOrderIds(
		records: Array<{ status: PaymentStatus; orderId: string | null; createdAt: Date }>,
		now: number,
	): Promise<Set<string>> {
		const capturedOrderIds = new Set(
			records
				.filter(
					(r) =>
						(r.status === PAYMENT_STATUS.CAPTURED || r.status === PAYMENT_STATUS.SUCCESS) &&
						Boolean(r.orderId),
				)
				.map((r) => r.orderId as string),
		);

		const pendingCheckOrderIds = [
			...new Set(
				records
					.filter(
						(r) =>
							r.status === PAYMENT_STATUS.FAILED &&
							Boolean(r.orderId) &&
							!capturedOrderIds.has(r.orderId as string) &&
							this.isWithinRetryWindow(r.createdAt, now),
					)
					.map((r) => r.orderId as string),
			),
		];

		if (pendingCheckOrderIds.length > 0) {
			const capturedSiblings = await this.prisma.paymentTransaction.findMany({
				where: {
					orderId: { in: pendingCheckOrderIds },
					status: { in: [PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.SUCCESS] },
				},
				select: { orderId: true },
			});
			for (const s of capturedSiblings) {
				if (s.orderId) {
					capturedOrderIds.add(s.orderId);
				}
			}
		}

		return capturedOrderIds;
	}

	private mapCustomerTransactionRecord(
		record: Prisma.PaymentTransactionGetPayload<{
			include: { refunds: true };
		}>,
		now: number,
		capturedOrderIds: Set<string>,
	): CustomerTransactionRecord {
		const meta = (record.metadata as TransactionMetadata | null) || {};
		const isFailed = record.status === PAYMENT_STATUS.FAILED;
		const isWithinWindow = this.isWithinRetryWindow(record.createdAt, now);
		const isOrderAlreadyPaid = Boolean(record.orderId && capturedOrderIds.has(record.orderId));

		const retryEligible = isFailed && isWithinWindow && !isOrderAlreadyPaid;
		const retryExpiresAt = retryEligible
			? new Date(record.createdAt.getTime() + PENDING_ORDER_REUSE_WINDOW_MS).toISOString()
			: null;

		const hasInvoice =
			record.status === PAYMENT_STATUS.CAPTURED ||
			record.status === PAYMENT_STATUS.SUCCESS ||
			record.status === PAYMENT_STATUS.REFUNDED;
		const invoiceUrl = hasInvoice ? buildTransactionInvoiceUrl(record.id) : null;

		let refundDetails: CustomerRefundSummary | null = null;
		if (record.refunds && record.refunds.length > 0) {
			const ref = record.refunds[0];
			refundDetails = {
				refundId: ref.id,
				razorpayRefundId: ref.razorpayRefundId,
				amountPaise: ref.amountPaise,
				amountInRupees: ref.amountPaise / 100,
				status: ref.status,
				reason: ref.reason ?? null,
				arn: ref.arn ?? null,
				processedAt: ref.processedAt ? ref.processedAt.toISOString() : null,
			};
		}

		const paymentMethod = (
			meta.paymentMethod ||
			meta.method ||
			DEFAULT_PAYMENT_METHOD
		).toUpperCase();

		return {
			transactionId: record.id,
			orderId: record.orderId,
			restaurantId: record.restaurantId,
			amountPaise: record.amountPaise,
			amountInRupees: record.amountPaise / 100,
			currency: record.currency,
			paymentMethod,
			status: record.status,
			failureReason: record.failureReason ?? null,
			razorpayPaymentId: record.razorpayPaymentId,
			razorpayOrderId: record.razorpayOrderId,
			createdAt: record.createdAt,
			hasInvoice,
			invoiceUrl,
			retryEligible,
			retryExpiresAt,
			refundDetails,
		};
	}

	async findTransactionsByCustomer(
		params: CustomerTransactionFilterParams,
	): Promise<PaginatedCustomerTransactionsResult> {
		const where = this.buildCustomerWhere(params);
		const sortBy =
			params.sortBy === PAYMENT_SORT_FIELDS.AMOUNT_PAISE
				? PAYMENT_SORT_FIELDS.AMOUNT_PAISE
				: PAYMENT_SORT_FIELDS.CREATED_AT;
		const sortOrder: Prisma.SortOrder =
			params.sortOrder === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.ASC : SORT_DIRECTIONS.DESC;

		const page = Math.max(1, params.page || PAGINATION.DEFAULT_PAGE);
		const limit = Math.max(
			1,
			Math.min(PAGINATION.MAX_LIMIT, params.limit || PAGINATION.DEFAULT_LIMIT),
		);
		const skip = (page - 1) * limit;

		const [total, records] = await this.prisma.$transaction([
			this.prisma.paymentTransaction.count({ where }),
			this.prisma.paymentTransaction.findMany({
				where,
				orderBy: {
					[sortBy]: sortOrder,
				},
				skip,
				take: limit,
				include: {
					refunds: {
						orderBy: { createdAt: SORT_DIRECTIONS.DESC },
						take: 1,
					},
				},
			}),
		]);

		const now = Date.now();
		const capturedOrderIds = await this.resolveCapturedOrderIds(records, now);
		const transactions = records.map((record) =>
			this.mapCustomerTransactionRecord(record, now, capturedOrderIds),
		);

		const totalPages = Math.ceil(total / limit) || 1;
		return {
			transactions,
			pagination: {
				total,
				page,
				limit,
				totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1,
			},
		};
	}
}
