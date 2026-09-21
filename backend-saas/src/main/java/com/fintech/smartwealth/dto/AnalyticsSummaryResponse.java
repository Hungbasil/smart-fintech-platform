package com.fintech.smartwealth.dto;

import java.math.BigDecimal;

public record AnalyticsSummaryResponse(
        BigDecimal income,
        BigDecimal expense,
        BigDecimal net,
        Long transactionCount) {
}