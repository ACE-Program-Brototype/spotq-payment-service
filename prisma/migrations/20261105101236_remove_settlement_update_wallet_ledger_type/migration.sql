/*
  Warnings:

  - The values [CREDIT_SETTLEMENT,CREDIT_REFUND_ADJUSTMENT] on the enum `WalletLedgerType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `settlement_id` on the `wallet_ledger_entries` table. All the data in the column will be lost.
  - You are about to drop the `settlements` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WalletLedgerType_new" AS ENUM ('CREDIT_ORDER_PAYMENT', 'DEBIT_PAYOUT_WITHDRAWAL', 'DEBIT_ORDER_REFUND', 'CREDIT_PAYOUT_REVERSAL');
ALTER TABLE "wallet_ledger_entries" ALTER COLUMN "type" TYPE "WalletLedgerType_new" USING ("type"::text::"WalletLedgerType_new");
ALTER TYPE "WalletLedgerType" RENAME TO "WalletLedgerType_old";
ALTER TYPE "WalletLedgerType_new" RENAME TO "WalletLedgerType";
DROP TYPE "public"."WalletLedgerType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "wallet_ledger_entries" DROP CONSTRAINT "wallet_ledger_entries_settlement_id_fkey";

-- AlterTable
ALTER TABLE "wallet_ledger_entries" DROP COLUMN "settlement_id";

-- DropTable
DROP TABLE "settlements";

-- DropEnum
DROP TYPE "SettlementStatus";
