package com.fintech.smartwealth.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record InvestmentResponse(
        UUID id,
        String coinSymbol,
        BigDecimal quantity,
        BigDecimal buyPrice,
        BigDecimal currentPrice,
        BigDecimal profitLoss,
        BigDecimal profitLossPercentage
) {
}
