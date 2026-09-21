package com.fintech.smartwealth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public record VoiceTransactionRequest(
        @NotBlank @Size(max = 500) String text,
        @NotNull UUID walletId,
        @NotNull UUID categoryId,
        @NotNull LocalDateTime transactionDate) {
}