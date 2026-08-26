package com.fintech.smartwealth.dto;

import java.math.BigDecimal;

public record MarketPriceResponse(
        String coinSymbol,
        BigDecimal price
) {
}
