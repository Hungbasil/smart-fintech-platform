package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.BudgetRequest;
import com.fintech.smartwealth.dto.BudgetResponse;
import com.fintech.smartwealth.service.BudgetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/budgets")
@RequiredArgsConstructor
public class BudgetController {
    private final BudgetService budgetService;

    @GetMapping
    public List<BudgetResponse> findAll() { return budgetService.findAll(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BudgetResponse save(@Valid @RequestBody BudgetRequest request) { return budgetService.save(request); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { budgetService.delete(id); }
}