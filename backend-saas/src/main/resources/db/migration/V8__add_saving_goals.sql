CREATE TABLE IF NOT EXISTS saving_goals (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    target_amount NUMERIC(19, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(19, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    deadline DATE,
    user_id UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_saving_goals_user_id ON saving_goals(user_id);