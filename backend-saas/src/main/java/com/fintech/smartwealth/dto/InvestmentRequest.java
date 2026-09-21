package com.fintech.smartwealth.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record InvestmentRequest(
        @NotBlank String coinSymbol,
        @NotNull @DecimalMin(value = "0.00000001") BigDecimal quantity,
        @NotNull @DecimalMin(value = "0.00000001") BigDecimal buyPrice
) {
}
