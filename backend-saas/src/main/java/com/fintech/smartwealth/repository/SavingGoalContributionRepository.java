package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.SavingGoalContribution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SavingGoalContributionRepository extends JpaRepository<SavingGoalContribution, UUID> {
    List<SavingGoalContribution> findBySavingGoalIdOrderByContributedAtDesc(UUID savingGoalId);
}