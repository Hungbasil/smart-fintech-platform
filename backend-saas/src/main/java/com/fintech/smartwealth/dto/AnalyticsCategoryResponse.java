package com.fintech.smartwealth.dto;

import java.math.BigDecimal;

public record AnalyticsCategoryResponse(String category, BigDecimal amount) {
}