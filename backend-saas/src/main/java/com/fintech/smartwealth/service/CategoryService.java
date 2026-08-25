package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.BudgetRepository;
import com.fintech.smartwealth.repository.RecurringTransactionRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final RecurringTransactionRepository recurringTransactionRepository;

    public List<Category> findAll() {
        return securityUtils.isAdmin()
            ? categoryRepository.findAll()
            : categoryRepository.findAvailableForUser(securityUtils.getCurrentUserId());
    }

    public Category findById(UUID id) {
        if (securityUtils.isAdmin()) {
            return categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        }
        return categoryRepository.findAvailableById(id, securityUtils.getCurrentUserId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
    }

    public Category create(Category category) {
        User user = userRepository.findById(securityUtils.getCurrentUserId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        category.setUser(user);
        return categoryRepository.save(category);
    }

    public Category update(UUID id, Category category) {
        Category existing = categoryRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        requirePersonalOwnership(existing);
        existing.setName(category.getName());
        existing.setType(category.getType());
        return categoryRepository.save(existing);
    }

    public void delete(UUID id) {
        Category existing = categoryRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        requirePersonalOwnership(existing);
        if (transactionRepository.existsByCategoryId(id)
            || budgetRepository.existsByCategoryId(id)
            || recurringTransactionRepository.existsByCategoryId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Không thể xóa danh mục vì danh mục đang được liên kết với giao dịch, ngân sách hoặc giao dịch định kỳ. Hãy xóa hoặc đổi các liên kết trước.");
        }
        categoryRepository.delete(existing);
    }

    private void requirePersonalOwnership(Category category) {
        if (!securityUtils.isAdmin()
                && (category.getUser() == null
                || !category.getUser().getId().equals(securityUtils.getCurrentUserId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Global or another user's category cannot be modified");
        }
    }
}
