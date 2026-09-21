package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.RecurringTransactionExecution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RecurringTransactionExecutionRepository extends JpaRepository<RecurringTransactionExecution, UUID> {
    boolean existsByRecurringTransactionIdAndExecutionMonth(UUID recurringTransactionId, String executionMonth);
}
