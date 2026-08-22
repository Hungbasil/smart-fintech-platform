package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    List<Budget> findByUserId(UUID userId);
    Optional<Budget> findByIdAndUserId(UUID id, UUID userId);
    Optional<Budget> findByUserIdAndCategoryId(UUID userId, UUID categoryId);
}