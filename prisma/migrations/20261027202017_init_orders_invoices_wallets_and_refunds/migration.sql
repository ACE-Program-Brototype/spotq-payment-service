-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'CALCULATING', 'CREDITED_TO_WALLET', 'FAILED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletLedgerType" AS ENUM ('CREDIT_SETTLEMENT', 'DEBIT_PAYOUT_WITHDRAWAL', 'CREDIT_REFUND_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PlatformTransactionType" AS ENUM ('CUSTOMER_PAYMENT_INTAKE', 'SETTLEMENT_DISBURSED', 'REFUND_EXPENSE');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CAPTURED';

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_plan_id_fkey";

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "customer_id" UUID,
ADD COLUMN     "order_id" UUID,
ALTER COLUMN "plan_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "subscription_id" UUID,
    "payment_transaction_id" UUID,
    "invoice_number" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoice_pdf_key" TEXT,
    "pdf_generated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "paid_at" TIMESTAMPTZ,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_refunds" (
    "id" UUID NOT NULL,
    "payment_transaction_id" UUID NOT NULL,
    "razorpay_refund_id" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "RefundStatus" NOT NULL DEFAULT 'PROCESSED',
    "reason" TEXT,
    "arn" TEXT,
    "payment_method" TEXT,
    "destination" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_wallets" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "balance_paise" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "razorpay_fund_account_id" TEXT,
    "bank_name" TEXT,
    "bank_account_last4" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "restaurant_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger_entries" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "settlement_id" UUID,
    "type" "WalletLedgerType" NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "balance_before" BIGINT NOT NULL,
    "balance_after" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "reference_id" TEXT,
    "utr_number" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "settlement_number" TEXT NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "settlement_date" DATE NOT NULL,
    "orders_count" INTEGER NOT NULL,
    "gross_sales_paise" BIGINT NOT NULL,
    "total_refunds_paise" BIGINT NOT NULL,
    "net_credit_paise" BIGINT NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "credited_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_wallets" (
    "id" UUID NOT NULL,
    "total_platform_balance_paise" BIGINT NOT NULL DEFAULT 0,
    "total_disbursed_to_venues_paise" BIGINT NOT NULL DEFAULT 0,
    "total_refunded_paise" BIGINT NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_ledger_transactions" (
    "id" UUID NOT NULL,
    "platform_wallet_id" UUID NOT NULL,
    "type" "PlatformTransactionType" NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "running_balance_paise" BIGINT NOT NULL,
    "reference_id" VARCHAR(100),
    "restaurant_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_invoice_number_key" ON "billing_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "billing_invoices_restaurant_id_idx" ON "billing_invoices"("restaurant_id");

-- CreateIndex
CREATE INDEX "billing_invoices_status_idx" ON "billing_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_razorpay_refund_id_key" ON "payment_refunds"("razorpay_refund_id");

-- CreateIndex
CREATE INDEX "payment_refunds_payment_transaction_id_idx" ON "payment_refunds"("payment_transaction_id");

-- CreateIndex
CREATE INDEX "payment_refunds_razorpay_refund_id_idx" ON "payment_refunds"("razorpay_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_wallets_restaurant_id_key" ON "restaurant_wallets"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ledger_entries_reference_id_key" ON "wallet_ledger_entries"("reference_id");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_wallet_id_created_at_idx" ON "wallet_ledger_entries"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "settlements_settlement_number_key" ON "settlements"("settlement_number");

-- CreateIndex
CREATE INDEX "settlements_restaurant_id_status_idx" ON "settlements"("restaurant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_restaurant_id_settlement_date_key" ON "settlements"("restaurant_id", "settlement_date");

-- CreateIndex
CREATE UNIQUE INDEX "platform_wallets_currency_key" ON "platform_wallets"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "platform_ledger_transactions_reference_id_key" ON "platform_ledger_transactions"("reference_id");

-- CreateIndex
CREATE INDEX "platform_ledger_transactions_type_created_at_idx" ON "platform_ledger_transactions"("type", "created_at");

-- CreateIndex
CREATE INDEX "platform_ledger_transactions_restaurant_id_idx" ON "platform_ledger_transactions"("restaurant_id");

-- CreateIndex
CREATE INDEX "payment_transactions_customer_id_idx" ON "payment_transactions"("customer_id");

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_idx" ON "payment_transactions"("order_id");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "restaurant_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_ledger_transactions" ADD CONSTRAINT "platform_ledger_transactions_platform_wallet_id_fkey" FOREIGN KEY ("platform_wallet_id") REFERENCES "platform_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Check Constraints to prevent negative amounts
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_amount_paise_check" CHECK ("amount_paise" > 0);
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_amount_paise_check" CHECK ("amount_paise" > 0);
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_amount_paise_check" CHECK ("amount_paise" > 0);
ALTER TABLE "restaurant_wallets" ADD CONSTRAINT "restaurant_wallets_balance_paise_check" CHECK ("balance_paise" >= 0);
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_amount_paise_check" CHECK ("amount_paise" > 0);
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_net_credit_paise_check" CHECK ("net_credit_paise" >= 0);
ALTER TABLE "platform_wallets" ADD CONSTRAINT "platform_wallets_balance_paise_check" CHECK ("total_platform_balance_paise" >= 0);
ALTER TABLE "platform_ledger_transactions" ADD CONSTRAINT "platform_ledger_transactions_amount_paise_check" CHECK ("amount_paise" > 0);
