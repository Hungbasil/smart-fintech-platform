package com.fintech.smartwealth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminFinancialHealthDTO {
    private BigDecimal totalBorrowed; // amount user owes
    private BigDecimal totalLent; // amount lent to others
    private long pendingDebtsCount;
    private long activeRecurringTransactions;
    private long activeSavingGoals;
    private BigDecimal savingGoalsProgress; // sum of current / sum of target
    
    // Users by balance ranges (VND)
    private long usersBalanceRange0To1M;
    private long usersBalanceRange1MTo10M;
    private long usersBalanceRangeAbove10M;
}
