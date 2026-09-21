CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    budget_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    debt_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    recurring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users(id)
);