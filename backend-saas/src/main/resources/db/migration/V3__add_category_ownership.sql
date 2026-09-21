ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS user_id UUID;

UPDATE categories
SET user_id = (
    SELECT w.user_id
    FROM transactions t
    JOIN wallets w ON w.id = t.wallet_id
    WHERE t.category_id = categories.id
    LIMIT 1
)
WHERE user_id IS NULL;

ALTER TABLE categories
    ADD CONSTRAINT fk_categories_user
    FOREIGN KEY (user_id) REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);