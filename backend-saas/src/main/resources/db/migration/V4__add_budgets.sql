CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    monthly_limit NUMERIC(19, 2) NOT NULL CHECK (monthly_limit > 0),
    UNIQUE (user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);