package com.fintech.smartwealth.dto;

import java.math.BigDecimal;

public record MarketCandleResponse(
        long openTime,
        BigDecimal open,
        BigDecimal high,
        BigDecimal low,
        BigDecimal close,
        BigDecimal volume
) {
}
