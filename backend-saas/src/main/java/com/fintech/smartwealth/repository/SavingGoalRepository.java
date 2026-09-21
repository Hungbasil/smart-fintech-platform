package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.SavingGoal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SavingGoalRepository extends JpaRepository<SavingGoal, UUID> {
    List<SavingGoal> findByUserId(UUID userId);
    Optional<SavingGoal> findByIdAndUserId(UUID id, UUID userId);
}