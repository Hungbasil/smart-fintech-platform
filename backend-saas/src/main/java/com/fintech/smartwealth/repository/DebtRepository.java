package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.Debt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DebtRepository extends JpaRepository<Debt, UUID> {
    List<Debt> findByUserIdOrderByStatusAscDueDateAsc(UUID userId);
    Optional<Debt> findByIdAndUserId(UUID id, UUID userId);
    List<Debt> findByStatus(String status);
}
