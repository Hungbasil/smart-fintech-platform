package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.UserRepository;
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

    public List<Category> findAll() {
        return securityUtils.isAdmin()
            ? categoryRepository.findAll()
            : categoryRepository.findByUserId(securityUtils.getCurrentUserId());
    }

    public Category findById(UUID id) {
        if (securityUtils.isAdmin()) {
            return categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        }
        return categoryRepository.findByIdAndUserId(id, securityUtils.getCurrentUserId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
    }

    public Category create(Category category) {
        User user = userRepository.findById(securityUtils.getCurrentUserId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        category.setUser(user);
        return categoryRepository.save(category);
    }

    public Category update(UUID id, Category category) {
        Category existing = findById(id);
        existing.setName(category.getName());
        existing.setType(category.getType());
        return categoryRepository.save(existing);
    }

    public void delete(UUID id) {
        categoryRepository.delete(findById(id));
    }
}
