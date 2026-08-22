package com.fintech.smartwealth.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record BudgetResponse(UUID id, UUID categoryId, String categoryName, BigDecimal monthlyLimit, BigDecimal spent, BigDecimal percentage) {
}