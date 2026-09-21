CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    counterparty_name VARCHAR(255) NOT NULL,
    amount NUMERIC(19, 2) NOT NULL CHECK (amount > 0),
    type VARCHAR(16) NOT NULL CHECK (type IN ('LEND', 'BORROW')),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SETTLED')),
    due_date DATE,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
