package com.fintech.smartwealth.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class TransactionResponse {
    private UUID id;
    private BigDecimal amount;
    private String description;
    private LocalDateTime transactionDate;
    private UUID walletId;
    private UUID categoryId;

    public TransactionResponse() {
    }

    public TransactionResponse(UUID id, BigDecimal amount, String description, LocalDateTime transactionDate, UUID walletId, UUID categoryId) {
        this.id = id;
        this.amount = amount;
        this.description = description;
        this.transactionDate = transactionDate;
        this.walletId = walletId;
        this.categoryId = categoryId;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDateTime transactionDate) {
        this.transactionDate = transactionDate;
    }

    public UUID getWalletId() {
        return walletId;
    }

    public void setWalletId(UUID walletId) {
        this.walletId = walletId;
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(UUID categoryId) {
        this.categoryId = categoryId;
    }
}
