package com.fintech.smartwealth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminTransactionAnalyticsDTO {
    private Map<String, BigDecimal> categorySpending; // top 10 categories
    private Map<String, BigDecimal> walletSpending;
    private List<TransactionResponse> largestTransactions; // top 20
    private Map<LocalDate, Long> dailyTransactionCount;
    private long totalTransactionCount;
}
