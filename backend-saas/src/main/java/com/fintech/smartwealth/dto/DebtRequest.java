package com.fintech.smartwealth.dto;

import com.fintech.smartwealth.entity.DebtType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DebtRequest(
        @NotBlank String counterpartyName,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull DebtType type,
        LocalDate dueDate,
        String description
) {
}
