package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.AiAction;
import com.fintech.smartwealth.dto.AiInsightsResponse;
import com.fintech.smartwealth.dto.BudgetResponse;
import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiInsightsService {
    private final BudgetService budgetService;
    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final SecurityUtils securityUtils;

    public AiInsightsResponse getInsights() {
        var userId = securityUtils.getCurrentUserId();
        List<Transaction> transactions = transactionRepository.findByWalletUserId(userId);
        List<BudgetResponse> budgets = budgetService.findAll();
        List<String> suggestions = new ArrayList<>();
        List<AiInsightsResponse.BudgetRecommendation> recommendations = budgets.stream()
                .map(budget -> new AiInsightsResponse.BudgetRecommendation(
                        budget.categoryName(),
                        budget.totalSpent().multiply(BigDecimal.valueOf(1.1)).max(budget.budgetAmount()),
                        "Dựa trên mức chi hiện tại và một khoảng đệm 10%."))
                .toList();
        budgets.stream().filter(budget -> budget.percentage().compareTo(BigDecimal.valueOf(80)) >= 0)
                .forEach(budget -> suggestions.add(String.format("%s đã dùng %.0f%% ngân sách, nên xem lại trong tháng này.", budget.categoryName(), budget.percentage())));
        BigDecimal total = transactions.stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal average = transactions.isEmpty() ? BigDecimal.ZERO : total.divide(BigDecimal.valueOf(transactions.size()), 2, java.math.RoundingMode.HALF_UP);
        List<AiInsightsResponse.Anomaly> anomalies = transactions.stream()
                .filter(transaction -> transaction.getAmount() != null && average.signum() > 0 && transaction.getAmount().compareTo(average.multiply(BigDecimal.valueOf(2))) >= 0)
                .sorted(Comparator.comparing(Transaction::getAmount).reversed()).limit(3)
                .map(transaction -> new AiInsightsResponse.Anomaly(transaction.getDescription(), transaction.getAmount(), "Khoản này cao ít nhất gấp đôi mức chi trung bình trong lịch sử hiện có."))
                .toList();
        if (!anomalies.isEmpty()) suggestions.add("Có " + anomalies.size() + " khoản chi lớn hơn đáng kể mức trung bình, hãy kiểm tra lại.");
        if (suggestions.isEmpty()) suggestions.add("Dữ liệu hiện tại đang ổn định. Tiếp tục ghi nhận giao dịch để SmartFin cải thiện dự báo.");
        return new AiInsightsResponse(
                "Gợi ý được tạo từ dữ liệu tháng " + YearMonth.now() + ".",
                suggestions,
                recommendations,
                anomalies,
                List.of(new AiAction("OPEN_BUDGETS", "Xem ngân sách", "/budgets", Map.of()), new AiAction("OPEN_ANALYTICS", "Mở phân tích", "/analytics/overview", Map.of())),
                List.of("Ngân sách hiện tại", "Giao dịch của bạn", "SmartFin AI"),
                OffsetDateTime.now());
    }
}