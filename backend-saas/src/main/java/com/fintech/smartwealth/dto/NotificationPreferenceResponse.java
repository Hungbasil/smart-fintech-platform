package com.fintech.smartwealth.dto;

public record NotificationPreferenceResponse(
        boolean budgetEnabled,
        boolean debtEnabled,
        boolean recurringEnabled) {
}