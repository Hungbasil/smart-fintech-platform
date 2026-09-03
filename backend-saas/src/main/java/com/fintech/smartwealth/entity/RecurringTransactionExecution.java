package com.fintech.smartwealth.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "recurring_transaction_executions", uniqueConstraints = @UniqueConstraint(name = "uq_recurring_execution_month", columnNames = {"recurring_transaction_id", "execution_month"}))
@Data
@NoArgsConstructor
public class RecurringTransactionExecution {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recurring_transaction_id", nullable = false)
    private RecurringTransaction recurringTransaction;

    @Column(name = "execution_month", nullable = false, length = 7)
    private String executionMonth;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transaction_id", nullable = false)
    private Transaction transaction;

    @Column(name = "executed_at", nullable = false)
    private LocalDateTime executedAt;

    @PrePersist
    void onCreate() {
        if (executedAt == null) executedAt = LocalDateTime.now();
    }
}
