/*
  Warnings:

  - You are about to drop the column `description` on the `wallet_ledger_entries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "wallet_ledger_entries" DROP COLUMN "description";
