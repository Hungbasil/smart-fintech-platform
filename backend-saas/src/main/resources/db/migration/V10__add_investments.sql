CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    coin_symbol VARCHAR(20) NOT NULL,
    quantity NUMERIC(30, 12) NOT NULL CHECK (quantity > 0),
    buy_price NUMERIC(30, 12) NOT NULL CHECK (buy_price > 0)
);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
