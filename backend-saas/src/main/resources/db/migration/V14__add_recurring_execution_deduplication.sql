CREATE TABLE IF NOT EXISTS recurring_transaction_executions (
    id UUID PRIMARY KEY,
    recurring_transaction_id UUID NOT NULL,
    execution_month VARCHAR(7) NOT NULL,
    transaction_id UUID NOT NULL,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recurring_execution_recurring FOREIGN KEY (recurring_transaction_id) REFERENCES recurring_transactions(id),
    CONSTRAINT fk_recurring_execution_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    CONSTRAINT uq_recurring_execution_month UNIQUE (recurring_transaction_id, execution_month)
);
