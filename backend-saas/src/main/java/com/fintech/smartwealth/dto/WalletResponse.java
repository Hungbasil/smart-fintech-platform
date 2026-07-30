package com.fintech.smartwealth.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class WalletResponse {
    private UUID id;
    private String name;
    private BigDecimal balance;
    private UUID userId;

    public WalletResponse() {
    }

    public WalletResponse(UUID id, String name, BigDecimal balance, UUID userId) {
        this.id = id;
        this.name = name;
        this.balance = balance;
        this.userId = userId;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }
}
