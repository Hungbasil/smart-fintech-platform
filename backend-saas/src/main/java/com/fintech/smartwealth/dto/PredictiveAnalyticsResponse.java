package com.fintech.smartwealth.dto;

import java.math.BigDecimal;
import java.util.List;

public record PredictiveAnalyticsResponse(
        BigDecimal predictedAmount,
        BigDecimal predictedIncome,
        BigDecimal currentBalance,
        BigDecimal projectedBalance,
        List<HistoricalExpense> historicalData,
        String trend
) {
    public record HistoricalExpense(String month, BigDecimal amount) {
    }
}
