/*
  Warnings:

  - Made the column `status` on table `wallet_ledger_entries` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "wallet_ledger_entries" ALTER COLUMN "status" SET NOT NULL;
