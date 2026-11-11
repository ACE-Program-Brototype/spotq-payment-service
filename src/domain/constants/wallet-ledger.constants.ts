export const WALLET_LEDGER_TYPES = {
	CREDIT_ORDER_PAYMENT: 'CREDIT_ORDER_PAYMENT',
	DEBIT_PAYOUT_WITHDRAWAL: 'DEBIT_PAYOUT_WITHDRAWAL',
	DEBIT_ORDER_REFUND: 'DEBIT_ORDER_REFUND',
	CREDIT_PAYOUT_REVERSAL: 'CREDIT_PAYOUT_REVERSAL',
} as const;

export type WalletLedgerType = (typeof WALLET_LEDGER_TYPES)[keyof typeof WALLET_LEDGER_TYPES];

export const WALLET_LEDGER_STATUSES = {
	PROCESSING: 'PROCESSING',
	PROCESSED: 'PROCESSED',
	REVERSED: 'REVERSED',
	FAILED: 'FAILED',
} as const;

export type WalletLedgerStatus =
	(typeof WALLET_LEDGER_STATUSES)[keyof typeof WALLET_LEDGER_STATUSES];

export type WalletWithdrawalFailureStatus =
	| typeof WALLET_LEDGER_STATUSES.FAILED
	| typeof WALLET_LEDGER_STATUSES.REVERSED;

export const WALLET_LEDGER_REFERENCE_PREFIX = {
	PAYMENT: 'payment_',
	REFUND: 'refund_',
	REVERSAL_REFUND: 'reversal_refund_',
} as const;

export const buildPaymentLedgerReferenceId = (paymentTransactionId: string): string =>
	`${WALLET_LEDGER_REFERENCE_PREFIX.PAYMENT}${paymentTransactionId}`;

export const buildRefundLedgerReferenceId = (razorpayRefundId: string): string =>
	`${WALLET_LEDGER_REFERENCE_PREFIX.REFUND}${razorpayRefundId}`;

export const buildRefundReversalLedgerReferenceId = (razorpayRefundId: string): string =>
	`${WALLET_LEDGER_REFERENCE_PREFIX.REVERSAL_REFUND}${razorpayRefundId}`;
