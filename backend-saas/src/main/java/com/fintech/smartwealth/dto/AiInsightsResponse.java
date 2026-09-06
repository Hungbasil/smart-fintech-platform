package com.fintech.smartwealth.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record AiInsightsResponse(
        String headline,
        List<String> suggestions,
        List<BudgetRecommendation> budgetRecommendations,
        List<Anomaly> anomalies,
        List<AiAction> actions,
        List<String> sources,
        OffsetDateTime updatedAt) {
    public record Anomaly(String description, BigDecimal amount, String explanation) {
    }

    public record BudgetRecommendation(String categoryName, BigDecimal suggestedAmount, String reason) {
    }
}