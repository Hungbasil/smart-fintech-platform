package com.fintech.smartwealth.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public class RecurringTransactionRequest {
    @NotNull private UUID walletId;
    @NotNull private UUID categoryId;
    @NotNull @DecimalMin("0.01") private BigDecimal amount;
    @NotBlank private String description;
    @NotNull @Min(1) @Max(31) private Integer dayOfMonth;
    private boolean active = true;
    public UUID getWalletId() { return walletId; } public void setWalletId(UUID value) { walletId = value; }
    public UUID getCategoryId() { return categoryId; } public void setCategoryId(UUID value) { categoryId = value; }
    public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal value) { amount = value; }
    public String getDescription() { return description; } public void setDescription(String value) { description = value; }
    public Integer getDayOfMonth() { return dayOfMonth; } public void setDayOfMonth(Integer value) { dayOfMonth = value; }
    public boolean isActive() { return active; } public void setActive(boolean value) { active = value; }
}