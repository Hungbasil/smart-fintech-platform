ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS budget_month INTEGER;

ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS budget_year INTEGER;

UPDATE budgets
SET budget_month = EXTRACT(MONTH FROM CURRENT_DATE),
    budget_year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE budget_month IS NULL OR budget_year IS NULL;

ALTER TABLE budgets
    ALTER COLUMN budget_month SET NOT NULL;

ALTER TABLE budgets
    ALTER COLUMN budget_year SET NOT NULL;

ALTER TABLE budgets
    DROP CONSTRAINT IF EXISTS budgets_user_id_category_id_key;

ALTER TABLE budgets
    ADD CONSTRAINT budgets_user_category_month_year_key UNIQUE (user_id, category_id, budget_month, budget_year);

ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS amount NUMERIC(19, 2);

UPDATE budgets
SET amount = monthly_limit
WHERE amount IS NULL;

ALTER TABLE budgets
    DROP COLUMN IF EXISTS monthly_limit;

ALTER TABLE budgets
    ALTER COLUMN amount SET NOT NULL;

ALTER TABLE budgets
    ADD CONSTRAINT budgets_amount_positive CHECK (amount > 0);