package com.fintech.smartwealth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminOverviewDTO {
    private long totalUsers;
    private long totalWallets;
    private long totalTransactions;
    private BigDecimal totalBalance;
    private BigDecimal monthlySpent;
    private BigDecimal monthlyIncome;
    private int newUsersThisMonth;
    private int activeUsersToday;
}
