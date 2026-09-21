ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(30) NOT NULL DEFAULT 'STANDARD';

CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);