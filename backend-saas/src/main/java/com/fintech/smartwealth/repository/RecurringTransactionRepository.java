package com.fintech.smartwealth.repository;
import com.fintech.smartwealth.entity.RecurringTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface RecurringTransactionRepository extends JpaRepository<RecurringTransaction, UUID> {
    List<RecurringTransaction> findByUserId(UUID userId);
    Optional<RecurringTransaction> findByIdAndUserId(UUID id, UUID userId);
    List<RecurringTransaction> findByActiveTrue();
}