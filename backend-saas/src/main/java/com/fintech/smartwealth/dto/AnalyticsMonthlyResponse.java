package com.fintech.smartwealth.dto;

import java.math.BigDecimal;

public record AnalyticsMonthlyResponse(String month, BigDecimal income, BigDecimal expense) {
}