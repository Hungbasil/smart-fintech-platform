ALTER TABLE transactions ADD COLUMN IF NOT EXISTS import_fingerprint VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_transactions_import_fingerprint ON transactions(import_fingerprint);
