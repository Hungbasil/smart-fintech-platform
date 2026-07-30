package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.CreateTransactionRequest;
import com.fintech.smartwealth.dto.TransactionResponse;
import com.fintech.smartwealth.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public List<TransactionResponse> findAll() {
        return transactionService.findAll();
    }

    @GetMapping("/{id}")
    public TransactionResponse findById(@PathVariable UUID id) {
        return transactionService.findById(id);
    }

    @GetMapping("/wallet/{walletId}/total-expense")
    public BigDecimal getTotalExpenseByWalletId(@PathVariable UUID walletId) {
        return transactionService.getTotalExpenseByWalletId(walletId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse create(@Valid @RequestBody CreateTransactionRequest request) {
        return transactionService.create(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        transactionService.delete(id);
    }
}
