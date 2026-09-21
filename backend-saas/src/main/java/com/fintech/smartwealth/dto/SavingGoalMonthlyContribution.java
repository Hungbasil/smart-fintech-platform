package com.fintech.smartwealth.dto;

import java.math.BigDecimal;

public record SavingGoalMonthlyContribution(String month, BigDecimal amount) {
}