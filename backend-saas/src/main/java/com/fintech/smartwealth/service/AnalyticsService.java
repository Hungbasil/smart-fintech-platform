package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.AnalyticsCategoryResponse;
import com.fintech.smartwealth.dto.AnalyticsMonthlyResponse;
import com.fintech.smartwealth.dto.AnalyticsSummaryResponse;
import com.fintech.smartwealth.dto.PredictiveAnalyticsResponse;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final TransactionRepository transactionRepository;
    private final SecurityUtils securityUtils;
    private final WalletRepository walletRepository;

    @Cacheable(value = "user_analytics", key = "'summary:' + @securityUtils.getCurrentUserId() + ':' + #walletId + ':' + #fromDate + ':' + #toDate", condition = "!@securityUtils.isAdmin()")
    public AnalyticsSummaryResponse getSummary(UUID walletId, LocalDateTime fromDate, LocalDateTime toDate) {
        TransactionRepository.AnalyticsSummaryProjection result = transactionRepository
                .getAnalyticsSummary(currentUserId(), walletId, fromDate, toDate);
        BigDecimal income = valueOrZero(result.getIncome());
        BigDecimal expense = valueOrZero(result.getExpense());
        return new AnalyticsSummaryResponse(income, expense, income.subtract(expense), result.getTransactionCount());
    }

    @Cacheable(value = "user_analytics", key = "'categories:' + @securityUtils.getCurrentUserId() + ':' + #walletId + ':' + #fromDate + ':' + #toDate", condition = "!@securityUtils.isAdmin()")
    public List<AnalyticsCategoryResponse> getExpenseByCategory(UUID walletId, LocalDateTime fromDate, LocalDateTime toDate) {
        return transactionRepository.getExpenseByCategory(currentUserId(), walletId, fromDate, toDate).stream()
                .map(item -> new AnalyticsCategoryResponse(item.getCategory(), valueOrZero(item.getAmount())))
                .toList();
    }

    @Cacheable(value = "user_analytics", key = "'monthly:' + @securityUtils.getCurrentUserId() + ':' + #walletId + ':' + #fromDate + ':' + #toDate", condition = "!@securityUtils.isAdmin()")
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

            @Cacheable(value = "user_analytics", key = "'predictive:' + @securityUtils.getCurrentUserId()", condition = "!@securityUtils.isAdmin()")
            public PredictiveAnalyticsResponse predictNextMonthExpense() {
            LocalDate currentMonth = LocalDate.now().withDayOfMonth(1);
            LocalDate firstMonth = currentMonth.minusMonths(3);
            UUID userId = securityUtils.getCurrentUserId();
            Map<String, BigDecimal> expenses = new HashMap<>();
            transactionRepository.getHistoricalExpenses(userId, firstMonth.atStartOfDay(), currentMonth.atStartOfDay())
                .forEach(item -> expenses.put(item.getMonth(), valueOrZero(item.getAmount())));

            List<PredictiveAnalyticsResponse.HistoricalExpense> historicalData = new ArrayList<>();
            for (int index = 0; index < 3; index++) {
                LocalDate month = firstMonth.plusMonths(index);
                historicalData.add(new PredictiveAnalyticsResponse.HistoricalExpense(
                    month.toString().substring(0, 7), expenses.getOrDefault(month.toString().substring(0, 7), BigDecimal.ZERO)));
            }

            BigDecimal predictedAmount = historicalData.stream()
                .map(PredictiveAnalyticsResponse.HistoricalExpense::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(historicalData.size()), 2, java.math.RoundingMode.HALF_UP);
            BigDecimal latest = historicalData.get(2).amount();
            BigDecimal previous = historicalData.get(0).amount();
            String trend = latest.compareTo(previous) > 0 ? "INCREASING" : latest.compareTo(previous) < 0 ? "DECREASING" : "STABLE";
                BigDecimal predictedIncome = transactionRepository.sumIncomeByUserBetween(userId, firstMonth.atStartOfDay(), currentMonth.atStartOfDay())
                    .divide(BigDecimal.valueOf(3), 2, java.math.RoundingMode.HALF_UP);
                BigDecimal currentBalance = walletRepository.findByUserId(userId).stream()
                    .map(wallet -> wallet.getBalance() == null ? BigDecimal.ZERO : wallet.getBalance())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                return new PredictiveAnalyticsResponse(predictedAmount, predictedIncome, currentBalance,
                    currentBalance.add(predictedIncome).subtract(predictedAmount), historicalData, trend);
            }

    private UUID currentUserId() {
        return securityUtils.isAdmin() ? null : securityUtils.getCurrentUserId();
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}