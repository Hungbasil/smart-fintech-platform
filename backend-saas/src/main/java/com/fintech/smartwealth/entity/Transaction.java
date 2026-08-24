package com.fintech.smartwealth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal amount;

    private String description;

    @Column(nullable = false)
    private LocalDateTime transactionDate;

    @Column(name = "transaction_type", nullable = false)
    private String transactionType = "STANDARD";

    @ManyToOne
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;
}
