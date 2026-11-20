import {
	buildPaymentLedgerReferenceId,
	buildRefundLedgerReferenceId,
	buildRefundReversalLedgerReferenceId,
	WALLET_LEDGER_STATUSES,
	WALLET_LEDGER_TYPES,
} from '@domain/constants/wallet-ledger.constants.ts';
import type { PaymentRefund } from '@domain/entities/payment-refund.entity.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import {
	PaymentAlreadyRefundedError,
	PaymentOrderNotFoundError,
} from '@domain/errors/payment.errors.ts';
import type {
	CaptureOrderPaymentWithOutboxParams,
	CreatePaymentTransactionInput,
	CreateRenewalOrderWithInvoiceParams,
	FailOrderPaymentWithOutboxParams,
	IPaymentTransactionRepository,
	ProcessOrderRefundParams,
	ProcessOrderRefundResult,
	SyncRefundFromWebhookParams,
} from '@domain/repositories/payment-transaction.repository.interface.ts';
import { PaymentRefundPersistenceMapper } from '@infrastructure/mappers/payment-refund.persistence-mapper.ts';
import type {
	Prisma,
	PaymentRefund as PrismaPaymentRefund,
	PaymentTransaction as PrismaPaymentTransaction,
} from '@prisma/client';
import {
	DEFAULT_PAYMENT_METHOD,
	INVOICE_STATUS,
	OUTBOX_STATUS,
	PAYMENT_STATUS,
	PENDING_ORDER_REUSE_WINDOW_MS,
	REFUND_STATUS,
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

	private mapRefundToDomain(record: PrismaPaymentRefund): PaymentRefund {
		return PaymentRefundPersistenceMapper.toDomain(record);
	}
	async findById(id: string): Promise<PaymentTransaction | null> {
		const record = await this.prisma.paymentTransaction.findUnique({
			where: { id },
		});

		if (!record) return null;
		return this.mapToDomain(record);
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

	async findRefundByPaymentTransactionId(
		paymentTransactionId: string,
	): Promise<PaymentRefund | null> {
		const record = await this.prisma.paymentRefund.findFirst({
			where: { paymentTransactionId },
			orderBy: { createdAt: 'desc' },
		});

		return record ? this.mapRefundToDomain(record) : null;
	}

	async findByPaymentId(razorpayPaymentId: string): Promise<PaymentTransaction | null> {
		const record = await this.prisma.paymentTransaction.findUnique({
			where: { razorpayPaymentId },
		});

		if (!record) return null;
		return this.mapToDomain(record);
	}

	async findCapturedByOrderId(orderId: string): Promise<PaymentTransaction | null> {
		const record = await this.prisma.paymentTransaction.findFirst({
			where: {
				orderId,
				status: { in: [PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.SUCCESS] },
			},
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

	async createRenewalWithInvoice(
		params: CreateRenewalOrderWithInvoiceParams,
	): Promise<PaymentTransaction> {
		return await this.prisma.$transaction(async (tx) => {
			const record = await tx.paymentTransaction.create({
				data: {
					restaurantId: params.transaction.restaurantId,
					subscriptionId: params.transaction.subscriptionId || undefined,
					planId: params.transaction.planId,
					orderId: params.transaction.orderId,
					customerId: params.transaction.customerId,
					razorpayOrderId: params.transaction.razorpayOrderId,
					amountPaise: params.transaction.amountPaise,
					currency: params.transaction.currency,
					status: params.transaction.status || PAYMENT_STATUS.CREATED,
					metadata: (params.transaction.metadata as unknown as Prisma.InputJsonValue) || undefined,
				},
			});

			await tx.billingInvoice.create({
				data: {
					restaurantId: params.transaction.restaurantId,
					subscriptionId: params.transaction.subscriptionId || undefined,
					paymentTransactionId: record.id,
					invoiceNumber: params.invoice.invoiceNumber,
					amountPaise: params.transaction.amountPaise,
					currency: params.transaction.currency,
					status: params.invoice.status,
				},
			});

			return this.mapToDomain(record);
		});
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

			if (existing.orderId) {
				let wallet = await tx.restaurantWallet.findUnique({
					where: { restaurantId: existing.restaurantId },
				});

				if (!wallet) {
					wallet = await tx.restaurantWallet.create({
						data: {
							restaurantId: existing.restaurantId,
							balancePaise: 0n,
							currency: existing.currency,
							isLocked: false,
						},
					});
				}

				const creditReferenceId = buildPaymentLedgerReferenceId(existing.id);
				const existingLedger = await tx.walletLedgerEntry.findUnique({
					where: { referenceId: creditReferenceId },
				});

				if (!existingLedger) {
					const amountPaise = BigInt(params.transaction.amountPaise);
					const balanceBefore = wallet.balancePaise;
					const balanceAfter = balanceBefore + amountPaise;

					await tx.restaurantWallet.update({
						where: { id: wallet.id },
						data: {
							balancePaise: { increment: amountPaise },
							updatedAt: new Date(),
						},
					});

					await tx.walletLedgerEntry.create({
						data: {
							walletId: wallet.id,
							type: WALLET_LEDGER_TYPES.CREDIT_ORDER_PAYMENT,
							status: WALLET_LEDGER_STATUSES.PROCESSED,
							amountPaise,
							balanceBefore,
							balanceAfter,
							referenceId: creditReferenceId,
						},
					});
				}
			}

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

	async processOrderRefund(params: ProcessOrderRefundParams): Promise<ProcessOrderRefundResult> {
		return await this.prisma.$transaction(async (tx) => {
			const existing = await tx.paymentTransaction.findUnique({
				where: { id: params.transaction.id },
			});

			if (!existing) {
				throw new PaymentOrderNotFoundError();
			}

			if (existing.status === PAYMENT_STATUS.REFUNDED) {
				throw new PaymentAlreadyRefundedError();
			}

			const isProcessed = params.refund.status === REFUND_STATUS.PROCESSED;

			const updatedTx = await tx.paymentTransaction.update({
				where: { id: params.transaction.id },
				data: {
					status: params.transaction.status,
					updatedAt: params.transaction.updatedAt ?? new Date(),
				},
			});

			const refundRecord = await tx.paymentRefund.create({
				data: {
					paymentTransactionId: params.transaction.id,
					razorpayRefundId: params.refund.razorpayRefundId,
					amountPaise: params.refund.amountPaise,
					currency: params.refund.currency,
					status: params.refund.status,
					reason: params.refund.reason ?? null,
					arn: params.refund.arn ?? null,
					paymentMethod: params.refund.paymentMethod ?? null,
					processedAt: isProcessed ? new Date() : null,
				},
			});

			if (isProcessed && existing.orderId) {
				const wallet = await tx.restaurantWallet.findUnique({
					where: { restaurantId: existing.restaurantId },
				});

				if (wallet) {
					const refundReferenceId = buildRefundLedgerReferenceId(params.refund.razorpayRefundId);
					const existingLedger = await tx.walletLedgerEntry.findUnique({
						where: { referenceId: refundReferenceId },
					});

					if (!existingLedger) {
						const amountPaise = BigInt(params.refund.amountPaise);
						const balanceBefore = wallet.balancePaise;
						const balanceAfter = balanceBefore - amountPaise;

						await tx.restaurantWallet.update({
							where: { id: wallet.id },
							data: {
								balancePaise: { decrement: amountPaise },
								updatedAt: new Date(),
							},
						});

						await tx.walletLedgerEntry.create({
							data: {
								walletId: wallet.id,
								type: WALLET_LEDGER_TYPES.DEBIT_ORDER_REFUND,
								status: WALLET_LEDGER_STATUSES.PROCESSED,
								amountPaise,
								balanceBefore,
								balanceAfter,
								referenceId: refundReferenceId,
							},
						});
					}
				}
			}

			await tx.billingInvoice.updateMany({
				where: { paymentTransactionId: params.transaction.id },
				data: {
					status: INVOICE_STATUS.VOID,
					invoicePdfKey: null,
					updatedAt: new Date(),
				},
			});

			return {
				transaction: this.mapToDomain(updatedTx),
				refund: this.mapRefundToDomain(refundRecord),
			};
		});
	}

	async syncRefundFromWebhook(params: SyncRefundFromWebhookParams): Promise<void> {
		await this.prisma.$transaction(async (tx) => {
			const existingRefund = await tx.paymentRefund.findUnique({
				where: { razorpayRefundId: params.razorpayRefundId },
				include: { transaction: true },
			});

			if (existingRefund) {
				await tx.paymentRefund.update({
					where: { id: existingRefund.id },
					data: {
						status: params.status,
						...(params.arn ? { arn: params.arn } : {}),
						...(params.status === REFUND_STATUS.PROCESSED ? { processedAt: new Date() } : {}),
					},
				});

				const txRecord = existingRefund.transaction;

				if (params.status === REFUND_STATUS.PROCESSED) {
					await tx.paymentTransaction.update({
						where: { id: existingRefund.paymentTransactionId },
						data: {
							status: PAYMENT_STATUS.REFUNDED,
							updatedAt: new Date(),
						},
					});

					await tx.billingInvoice.updateMany({
						where: { paymentTransactionId: existingRefund.paymentTransactionId },
						data: {
							status: INVOICE_STATUS.VOID,
							invoicePdfKey: null,
							updatedAt: new Date(),
						},
					});

					if (txRecord?.orderId) {
						const wallet = await tx.restaurantWallet.findUnique({
							where: { restaurantId: txRecord.restaurantId },
						});

						if (wallet) {
							const refundReferenceId = buildRefundLedgerReferenceId(params.razorpayRefundId);
							const existingLedger = await tx.walletLedgerEntry.findUnique({
								where: { referenceId: refundReferenceId },
							});

							if (!existingLedger) {
								const amountPaise = BigInt(existingRefund.amountPaise);
								const balanceBefore = wallet.balancePaise;
								const balanceAfter = balanceBefore - amountPaise;

								await tx.restaurantWallet.update({
									where: { id: wallet.id },
									data: {
										balancePaise: { decrement: amountPaise },
										updatedAt: new Date(),
									},
								});

								await tx.walletLedgerEntry.create({
									data: {
										walletId: wallet.id,
										type: WALLET_LEDGER_TYPES.DEBIT_ORDER_REFUND,
										status: WALLET_LEDGER_STATUSES.PROCESSED,
										amountPaise,
										balanceBefore,
										balanceAfter,
										referenceId: refundReferenceId,
									},
								});
							}
						}
					}
				} else if (params.status === REFUND_STATUS.FAILED) {
					const refundReferenceId = buildRefundLedgerReferenceId(params.razorpayRefundId);
					const existingDebitLedger = await tx.walletLedgerEntry.findUnique({
						where: { referenceId: refundReferenceId },
					});

					if (existingDebitLedger) {
						const reversalReferenceId = buildRefundReversalLedgerReferenceId(
							params.razorpayRefundId,
						);
						const existingReversal = await tx.walletLedgerEntry.findUnique({
							where: { referenceId: reversalReferenceId },
						});

						if (!existingReversal) {
							const amountPaise = existingDebitLedger.amountPaise;
							const wallet = await tx.restaurantWallet.findUnique({
								where: { id: existingDebitLedger.walletId },
							});

							if (wallet) {
								const balanceBefore = wallet.balancePaise;
								const balanceAfter = balanceBefore + amountPaise;

								await tx.restaurantWallet.update({
									where: { id: wallet.id },
									data: {
										balancePaise: { increment: amountPaise },
										updatedAt: new Date(),
									},
								});

								await tx.walletLedgerEntry.create({
									data: {
										walletId: wallet.id,
										type: WALLET_LEDGER_TYPES.CREDIT_ORDER_PAYMENT,
										status: WALLET_LEDGER_STATUSES.PROCESSED,
										amountPaise,
										balanceBefore,
										balanceAfter,
										referenceId: reversalReferenceId,
									},
								});
							}
						}
					}

					if (txRecord && txRecord.status === PAYMENT_STATUS.REFUNDED) {
						await tx.paymentTransaction.update({
							where: { id: txRecord.id },
							data: {
								status: PAYMENT_STATUS.CAPTURED,
								updatedAt: new Date(),
							},
						});
					}
				}
				return;
			}

			if (params.razorpayPaymentId) {
				const txRecord = await tx.paymentTransaction.findUnique({
					where: { razorpayPaymentId: params.razorpayPaymentId },
				});

				if (txRecord) {
					const metadata = txRecord.metadata as Record<string, unknown> | null;
					const paymentMethod =
						typeof metadata?.method === 'string' ? metadata.method : DEFAULT_PAYMENT_METHOD;

					await tx.paymentRefund.create({
						data: {
							paymentTransactionId: txRecord.id,
							razorpayRefundId: params.razorpayRefundId,
							amountPaise: params.amountPaise ?? txRecord.amountPaise,
							currency: params.currency ?? txRecord.currency,
							status: params.status,
							reason: params.reason ?? null,
							arn: params.arn ?? null,
							paymentMethod,
							processedAt: params.status === REFUND_STATUS.PROCESSED ? new Date() : null,
						},
					});

					if (params.status === REFUND_STATUS.PROCESSED) {
						await tx.paymentTransaction.update({
							where: { id: txRecord.id },
							data: {
								status: PAYMENT_STATUS.REFUNDED,
								updatedAt: new Date(),
							},
						});

						await tx.billingInvoice.updateMany({
							where: { paymentTransactionId: txRecord.id },
							data: {
								status: INVOICE_STATUS.VOID,
								invoicePdfKey: null,
								updatedAt: new Date(),
							},
						});

						if (txRecord.orderId) {
							const wallet = await tx.restaurantWallet.findUnique({
								where: { restaurantId: txRecord.restaurantId },
							});

							if (wallet) {
								const refundReferenceId = buildRefundLedgerReferenceId(params.razorpayRefundId);
								const existingLedger = await tx.walletLedgerEntry.findUnique({
									where: { referenceId: refundReferenceId },
								});

								if (!existingLedger) {
									const amountPaise = BigInt(params.amountPaise ?? txRecord.amountPaise);
									const balanceBefore = wallet.balancePaise;
									const balanceAfter = balanceBefore - amountPaise;

									await tx.restaurantWallet.update({
										where: { id: wallet.id },
										data: {
											balancePaise: { decrement: amountPaise },
											updatedAt: new Date(),
										},
									});

									await tx.walletLedgerEntry.create({
										data: {
											walletId: wallet.id,
											type: WALLET_LEDGER_TYPES.DEBIT_ORDER_REFUND,
											status: WALLET_LEDGER_STATUSES.PROCESSED,
											amountPaise,
											balanceBefore,
											balanceAfter,
											referenceId: refundReferenceId,
										},
									});
								}
							}
						}
					}
				}
			}
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

	async resetToCreated(target: PaymentTransaction | string): Promise<PaymentTransaction> {
		const where = typeof target === 'string' ? { razorpayOrderId: target } : { id: target.id };

		const record = await this.prisma.paymentTransaction.update({
			where,
			data: {
				status: PAYMENT_STATUS.CREATED,
				failureReason: null,
			},
		});

		return this.mapToDomain(record);
	}
}
