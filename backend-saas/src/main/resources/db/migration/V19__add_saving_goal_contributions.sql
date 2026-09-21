CREATE TABLE IF NOT EXISTS saving_goal_contributions (
    id UUID PRIMARY KEY,
    saving_goal_id UUID NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    contributed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_saving_goal_contributions_goal FOREIGN KEY (saving_goal_id) REFERENCES saving_goals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saving_goal_contributions_goal_date
    ON saving_goal_contributions(saving_goal_id, contributed_at DESC);