package com.fintech.smartwealth.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SettleDebtRequest(@NotNull UUID walletId) {
}
