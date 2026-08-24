package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.AnalyticsCategoryResponse;
import com.fintech.smartwealth.dto.AnalyticsMonthlyResponse;
import com.fintech.smartwealth.dto.AnalyticsSummaryResponse;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final TransactionRepository transactionRepository;
    private final SecurityUtils securityUtils;

    public AnalyticsSummaryResponse getSummary(UUID walletId, LocalDateTime fromDate, LocalDateTime toDate) {
        TransactionRepository.AnalyticsSummaryProjection result = transactionRepository
                .getAnalyticsSummary(currentUserId(), walletId, fromDate, toDate);
        BigDecimal income = valueOrZero(result.getIncome());
        BigDecimal expense = valueOrZero(result.getExpense());
        return new AnalyticsSummaryResponse(income, expense, income.subtract(expense), result.getTransactionCount());
    }

    public List<AnalyticsCategoryResponse> getExpenseByCategory(UUID walletId, LocalDateTime fromDate, LocalDateTime toDate) {
        return transactionRepository.getExpenseByCategory(currentUserId(), walletId, fromDate, toDate).stream()
                .map(item -> new AnalyticsCategoryResponse(item.getCategory(), valueOrZero(item.getAmount())))
                .toList();
    }

    public List<AnalyticsMonthlyResponse> getMonthlyAnalytics(UUID walletId, LocalDateTime fromDate, LocalDateTime toDate) {
        LocalDate firstMonth = LocalDate.now().withDayOfMonth(1).minusMonths(5);
        LocalDateTime effectiveFrom = fromDate == null ? firstMonth.atStartOfDay() : fromDate;
        LocalDateTime effectiveTo = toDate == null ? LocalDate.now().plusDays(1).atStartOfDay() : toDate;
        return transactionRepository.getMonthlyAnalytics(currentUserId(), walletId, effectiveFrom, effectiveTo).stream()
                .map(item -> new AnalyticsMonthlyResponse(
                        item.getMonth(),
                        valueOrZero(item.getIncome()),
                        valueOrZero(item.getExpense())))
                .toList();
    }

    private UUID currentUserId() {
        return securityUtils.isAdmin() ? null : securityUtils.getCurrentUserId();
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}