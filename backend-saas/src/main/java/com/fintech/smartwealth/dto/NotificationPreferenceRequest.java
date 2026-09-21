package com.fintech.smartwealth.dto;

import jakarta.validation.constraints.NotNull;

public record NotificationPreferenceRequest(
        @NotNull Boolean budgetEnabled,
        @NotNull Boolean debtEnabled,
        @NotNull Boolean recurringEnabled) {
}