-- CreateIndex
CREATE INDEX "wallet_ledger_entries_wallet_id_type_status_idx" ON "wallet_ledger_entries"("wallet_id", "type", "status");
