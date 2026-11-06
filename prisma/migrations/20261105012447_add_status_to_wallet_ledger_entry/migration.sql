-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'REVERSED', 'FAILED');

-- AlterTable
ALTER TABLE "wallet_ledger_entries" ADD COLUMN     "status" "PayoutStatus" DEFAULT 'PROCESSED';
