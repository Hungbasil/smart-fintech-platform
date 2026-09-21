package com.fintech.smartwealth.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "saving_goal_contributions")
@Data
@NoArgsConstructor
public class SavingGoalContribution {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "saving_goal_id", nullable = false)
    private SavingGoal savingGoal;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "contributed_at", nullable = false)
    private LocalDateTime contributedAt;

    @PrePersist
    void onCreate() {
        if (contributedAt == null) contributedAt = LocalDateTime.now();
    }
}