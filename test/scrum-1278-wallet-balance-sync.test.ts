import { GetRestaurantWalletOverviewUseCase } from '@application/use-cases/restaurant-wallet/get-restaurant-wallet-overview.use-case.ts';
import { LinkBankAccountUseCase } from '@application/use-cases/restaurant-wallet/link-bank-account.use-case.ts';
import {
	buildPaymentLedgerReferenceId,
	buildRefundLedgerReferenceId,
	buildRefundReversalLedgerReferenceId,
	WALLET_LEDGER_STATUSES,
	WALLET_LEDGER_TYPES,
} from '@domain/constants/wallet-ledger.constants.ts';
import { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import { RestaurantWalletNotFoundError } from '@domain/errors/restaurant.errors.ts';
import type { IPaymentGateway } from '@domain/interfaces/payment-gateway.interface.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import { PrismaPaymentTransactionRepository } from '@infrastructure/repositories/prisma-payment-transaction.repository.ts';
import { PAYMENT_STATUS, REFUND_STATUS } from '@shared/constants/index.ts';

describe('SCRUM-1278: Wallet Balance Synchronization & Onboarding Invariant', () => {
	const mockRestaurantId = '3dc35af0-3ff5-4ee9-a60a-fbb47124731b';
	const mockOrderId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
	const mockTxId = 'pay-txn-uuid-001';

	describe('Wallet Overview and Bank Linking (Strict Onboarding Requirement)', () => {
		let mockWalletRepo: jest.Mocked<IRestaurantWalletRepository>;

		beforeEach(() => {
			mockWalletRepo = {
				findById: jest.fn(),
				findByRestaurantId: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				getOverview: jest.fn(),
				getTodayNetEarningsPaise: jest.fn(),
				reserveWithdrawal: jest.fn(),
				findLedgerEntriesPaginated: jest.fn(),
				markWithdrawalProcessed: jest.fn(),
				failWithdrawal: jest.fn(),
			};
		});

		it('should throw RestaurantWalletNotFoundError when getOverview finds no existing wallet', async () => {
			mockWalletRepo.getOverview.mockResolvedValueOnce(null);

			const useCase = new GetRestaurantWalletOverviewUseCase(mockWalletRepo);
			await expect(useCase.execute(mockRestaurantId)).rejects.toThrow(
				RestaurantWalletNotFoundError,
			);
			expect(mockWalletRepo.create).not.toHaveBeenCalled();
		});

		it('should throw RestaurantWalletNotFoundError when linking bank account without existing wallet', async () => {
			mockWalletRepo.findByRestaurantId.mockResolvedValueOnce(null);

			const mockGateway = {} as unknown as jest.Mocked<IPaymentGateway>;
			const mockLogger = {
				info: jest.fn(),
				error: jest.fn(),
				warn: jest.fn(),
				debug: jest.fn(),
			};

			const useCase = new LinkBankAccountUseCase(mockWalletRepo, mockGateway, mockLogger);
			await expect(
				useCase.execute({
					restaurantId: mockRestaurantId,
					accountNumber: '123456789012',
					ifsc: 'HDFC0001234',
					accountHolderName: 'Test Owner',
				}),
			).rejects.toThrow(RestaurantWalletNotFoundError);
			expect(mockWalletRepo.create).not.toHaveBeenCalled();
		});
	});

	describe('PrismaPaymentTransactionRepository - Wallet Real-Time Balance Synchronization', () => {
		let repo: PrismaPaymentTransactionRepository;
		let mockTx: {
			paymentTransaction: {
				findUnique: jest.Mock;
				update: jest.Mock;
			};
			restaurantWallet: {
				findUnique: jest.Mock;
				create: jest.Mock;
				update: jest.Mock;
			};
			walletLedgerEntry: {
				findUnique: jest.Mock;
				create: jest.Mock;
			};
			outboxEvent: {
				create: jest.Mock;
			};
			paymentRefund: {
				findUnique: jest.Mock;
				create: jest.Mock;
				update: jest.Mock;
			};
			billingInvoice: {
				updateMany: jest.Mock;
			};
		};
		let mockPrisma: {
			$transaction: jest.Mock;
		};

		beforeEach(() => {
			mockTx = {
				paymentTransaction: {
					findUnique: jest.fn(),
					update: jest.fn(),
				},
				restaurantWallet: {
					findUnique: jest.fn(),
					create: jest.fn(),
					update: jest.fn(),
				},
				walletLedgerEntry: {
					findUnique: jest.fn(),
					create: jest.fn(),
				},
				outboxEvent: {
					create: jest.fn(),
				},
				paymentRefund: {
					findUnique: jest.fn(),
					create: jest.fn(),
					update: jest.fn(),
				},
				billingInvoice: {
					updateMany: jest.fn(),
				},
			};

			mockPrisma = {
				$transaction: jest.fn((callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
			};

			repo = new PrismaPaymentTransactionRepository();
			(repo as unknown as { prisma: typeof mockPrisma }).prisma = mockPrisma;
		});

		it('should atomically increment wallet balance and create credit ledger entry on captureOrderPaymentWithOutbox', async () => {
			const existingTxRecord = {
				id: mockTxId,
				orderId: mockOrderId,
				restaurantId: mockRestaurantId,
				amountPaise: 45000,
				currency: 'INR',
				status: PAYMENT_STATUS.CREATED,
				razorpayOrderId: 'order_123',
				razorpayPaymentId: null,
			};

			mockTx.paymentTransaction.findUnique.mockResolvedValueOnce(existingTxRecord);
			mockTx.paymentTransaction.update.mockResolvedValueOnce({
				...existingTxRecord,
				status: PAYMENT_STATUS.CAPTURED,
				razorpayPaymentId: 'pay_123',
			});

			const existingWallet = {
				id: 'wallet-uuid-001',
				restaurantId: mockRestaurantId,
				balancePaise: 10000n,
			};
			mockTx.restaurantWallet.findUnique.mockResolvedValueOnce(existingWallet);
			mockTx.walletLedgerEntry.findUnique.mockResolvedValueOnce(null); // not credited yet

			const txEntity = new PaymentTransaction({
				...existingTxRecord,
				status: PAYMENT_STATUS.CAPTURED,
				razorpayPaymentId: 'pay_123',
			});

			await repo.captureOrderPaymentWithOutbox({
				transaction: txEntity,
				outbox: {
					eventType: 'payment.order.captured',
					aggregateId: mockOrderId,
					payload: {},
				},
			});

			expect(mockTx.restaurantWallet.update).toHaveBeenCalledWith({
				where: { id: 'wallet-uuid-001' },
				data: {
					balancePaise: { increment: 45000n },
					updatedAt: expect.any(Date),
				},
			});

			expect(mockTx.walletLedgerEntry.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					walletId: 'wallet-uuid-001',
					type: WALLET_LEDGER_TYPES.CREDIT_ORDER_PAYMENT,
					status: WALLET_LEDGER_STATUSES.PROCESSED,
					amountPaise: 45000n,
					balanceBefore: 10000n,
					balanceAfter: 55000n,
					referenceId: buildPaymentLedgerReferenceId(mockTxId),
				}),
			});
		});

		it('should auto-provision wallet if missing during captureOrderPaymentWithOutbox', async () => {
			const existingTxRecord = {
				id: mockTxId,
				orderId: mockOrderId,
				restaurantId: mockRestaurantId,
				amountPaise: 50000,
				currency: 'INR',
				status: PAYMENT_STATUS.CREATED,
				razorpayOrderId: 'order_123',
			};

			mockTx.paymentTransaction.findUnique.mockResolvedValueOnce(existingTxRecord);
			mockTx.paymentTransaction.update.mockResolvedValueOnce({
				...existingTxRecord,
				status: PAYMENT_STATUS.CAPTURED,
			});

			mockTx.restaurantWallet.findUnique.mockResolvedValueOnce(null);
			const newlyCreatedWallet = {
				id: 'new-wallet-uuid',
				restaurantId: mockRestaurantId,
				balancePaise: 0n,
			};
			mockTx.restaurantWallet.create.mockResolvedValueOnce(newlyCreatedWallet);
			mockTx.walletLedgerEntry.findUnique.mockResolvedValueOnce(null);

			const txEntity = new PaymentTransaction({
				...existingTxRecord,
				status: PAYMENT_STATUS.CAPTURED,
			});

			await repo.captureOrderPaymentWithOutbox({
				transaction: txEntity,
				outbox: {
					eventType: 'payment.order.captured',
					aggregateId: mockOrderId,
					payload: {},
				},
			});

			expect(mockTx.restaurantWallet.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					restaurantId: mockRestaurantId,
					balancePaise: 0n,
					currency: 'INR',
					isLocked: false,
				}),
			});

			expect(mockTx.restaurantWallet.update).toHaveBeenCalledWith({
				where: { id: 'new-wallet-uuid' },
				data: {
					balancePaise: { increment: 50000n },
					updatedAt: expect.any(Date),
				},
			});
		});

		it('should prevent duplicate wallet credit if ledger entry already exists (idempotency)', async () => {
			const existingTxRecord = {
				id: mockTxId,
				orderId: mockOrderId,
				restaurantId: mockRestaurantId,
				amountPaise: 45000,
				currency: 'INR',
				status: PAYMENT_STATUS.CREATED,
				razorpayOrderId: 'order_123',
			};

			mockTx.paymentTransaction.findUnique.mockResolvedValueOnce(existingTxRecord);
			mockTx.paymentTransaction.update.mockResolvedValueOnce({
				...existingTxRecord,
				status: PAYMENT_STATUS.CAPTURED,
			});

			mockTx.restaurantWallet.findUnique.mockResolvedValueOnce({
				id: 'wallet-uuid-001',
				balancePaise: 45000n,
			});
			// Ledger already exists:
			mockTx.walletLedgerEntry.findUnique.mockResolvedValueOnce({
				id: 'existing-ledger-entry',
			});

			const txEntity = new PaymentTransaction({
				...existingTxRecord,
				status: PAYMENT_STATUS.CAPTURED,
			});

			await repo.captureOrderPaymentWithOutbox({
				transaction: txEntity,
				outbox: {
					eventType: 'payment.order.captured',
					aggregateId: mockOrderId,
					payload: {},
				},
			});

			expect(mockTx.restaurantWallet.update).not.toHaveBeenCalled();
			expect(mockTx.walletLedgerEntry.create).not.toHaveBeenCalled();
		});

		it('should atomically decrement wallet balance and create debit ledger entry on processOrderRefund', async () => {
			const existingTxRecord = {
				id: mockTxId,
				orderId: mockOrderId,
				restaurantId: mockRestaurantId,
				amountPaise: 45000,
				currency: 'INR',
				status: PAYMENT_STATUS.CAPTURED,
				razorpayOrderId: 'order_123',
			};

			mockTx.paymentTransaction.findUnique.mockResolvedValueOnce(existingTxRecord);
			mockTx.paymentTransaction.update.mockResolvedValueOnce({
				...existingTxRecord,
				status: PAYMENT_STATUS.REFUNDED,
			});
			mockTx.paymentRefund.create.mockResolvedValueOnce({
				id: 'refund-uuid-001',
				paymentTransactionId: mockTxId,
				razorpayRefundId: 'rfnd_123',
				amountPaise: 45000,
				status: REFUND_STATUS.PROCESSED,
			});

			mockTx.restaurantWallet.findUnique.mockResolvedValueOnce({
				id: 'wallet-uuid-001',
				restaurantId: mockRestaurantId,
				balancePaise: 45000n,
			});
			mockTx.walletLedgerEntry.findUnique.mockResolvedValueOnce(null); // not debited yet

			const txEntity = new PaymentTransaction({
				...existingTxRecord,
				status: PAYMENT_STATUS.REFUNDED,
			});

			await repo.processOrderRefund({
				transaction: txEntity,
				refund: {
					razorpayRefundId: 'rfnd_123',
					amountPaise: 45000,
					currency: 'INR',
					status: REFUND_STATUS.PROCESSED,
				},
			});

			expect(mockTx.restaurantWallet.update).toHaveBeenCalledWith({
				where: { id: 'wallet-uuid-001' },
				data: {
					balancePaise: { decrement: 45000n },
					updatedAt: expect.any(Date),
				},
			});

			expect(mockTx.walletLedgerEntry.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					walletId: 'wallet-uuid-001',
					type: WALLET_LEDGER_TYPES.DEBIT_ORDER_REFUND,
					status: WALLET_LEDGER_STATUSES.PROCESSED,
					amountPaise: 45000n,
					balanceBefore: 45000n,
					balanceAfter: 0n,
					referenceId: buildRefundLedgerReferenceId('rfnd_123'),
				}),
			});
		});

		it('should reverse wallet debit and revert transaction status to CAPTURED when syncRefundFromWebhook receives FAILED', async () => {
			const existingRefundRecord = {
				id: 'refund-uuid-001',
				paymentTransactionId: mockTxId,
				razorpayRefundId: 'rfnd_123',
				amountPaise: 45000,
				transaction: {
					id: mockTxId,
					orderId: mockOrderId,
					restaurantId: mockRestaurantId,
					status: PAYMENT_STATUS.REFUNDED,
				},
			};

			mockTx.paymentRefund.findUnique.mockResolvedValueOnce(existingRefundRecord);
			mockTx.paymentRefund.update.mockResolvedValueOnce({
				...existingRefundRecord,
				status: REFUND_STATUS.FAILED,
			});

			// Previous debit ledger entry exists:
			mockTx.walletLedgerEntry.findUnique
				.mockResolvedValueOnce({
					id: 'debit-ledger-id',
					walletId: 'wallet-uuid-001',
					amountPaise: 45000n,
				}) // refund_rfnd_123
				.mockResolvedValueOnce(null); // reversal_refund_rfnd_123 does not exist yet

			mockTx.restaurantWallet.findUnique.mockResolvedValueOnce({
				id: 'wallet-uuid-001',
				balancePaise: 5000n,
			});

			await repo.syncRefundFromWebhook({
				razorpayRefundId: 'rfnd_123',
				status: REFUND_STATUS.FAILED,
			});

			// Should credit back wallet
			expect(mockTx.restaurantWallet.update).toHaveBeenCalledWith({
				where: { id: 'wallet-uuid-001' },
				data: {
					balancePaise: { increment: 45000n },
					updatedAt: expect.any(Date),
				},
			});

			// Should create reversal ledger entry
			expect(mockTx.walletLedgerEntry.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					walletId: 'wallet-uuid-001',
					type: WALLET_LEDGER_TYPES.CREDIT_ORDER_PAYMENT,
					status: WALLET_LEDGER_STATUSES.PROCESSED,
					amountPaise: 45000n,
					balanceBefore: 5000n,
					balanceAfter: 50000n,
					referenceId: buildRefundReversalLedgerReferenceId('rfnd_123'),
				}),
			});

			// Should revert transaction status to CAPTURED
			expect(mockTx.paymentTransaction.update).toHaveBeenCalledWith({
				where: { id: mockTxId },
				data: {
					status: PAYMENT_STATUS.CAPTURED,
					updatedAt: expect.any(Date),
				},
			});
		});
	});
});
