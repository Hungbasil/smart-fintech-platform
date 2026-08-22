package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.BudgetRequest;
import com.fintech.smartwealth.dto.BudgetResponse;
import com.fintech.smartwealth.entity.Budget;
import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.BudgetRepository;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BudgetService {
    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final SecurityUtils securityUtils;

    public List<BudgetResponse> findAll() {
        UUID userId = securityUtils.getCurrentUserId();
        return budgetRepository.findByUserId(userId).stream().map(this::toResponse).toList();
    }

    public BudgetResponse save(BudgetRequest request) {
        UUID userId = securityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Category category = categoryRepository.findByIdAndUserId(request.getCategoryId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        if (!"EXPENSE".equalsIgnoreCase(category.getType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Budgets are only available for expense categories");
        }
        Budget budget = budgetRepository.findByUserIdAndCategoryId(userId, category.getId()).orElseGet(Budget::new);
        budget.setUser(user);
        budget.setCategory(category);
        budget.setMonthlyLimit(request.getMonthlyLimit());
        return toResponse(budgetRepository.save(budget));
    }

    public void delete(UUID id) {
        budgetRepository.delete(budgetRepository.findByIdAndUserId(id, securityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Budget not found")));
    }

    private BudgetResponse toResponse(Budget budget) {
        LocalDate from = LocalDate.now().withDayOfMonth(1);
        LocalDate to = from.plusMonths(1);
        BigDecimal spent = transactionRepository.sumExpenseByUserAndCategoryBetween(budget.getUser().getId(), budget.getCategory().getId(), from.atStartOfDay(), to.atStartOfDay());
        BigDecimal percentage = spent.divide(budget.getMonthlyLimit(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
        return new BudgetResponse(budget.getId(), budget.getCategory().getId(), budget.getCategory().getName(), budget.getMonthlyLimit(), spent, percentage);
    }
}