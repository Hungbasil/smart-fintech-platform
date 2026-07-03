package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.service.TransactionService;
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
    public List<Transaction> findAll() {
        return transactionService.findAll();
    }

    @GetMapping("/{id}")
    public Transaction findById(@PathVariable UUID id) {
        return transactionService.findById(id);
    }

    @GetMapping("/wallet/{walletId}/total-expense")
    public BigDecimal getTotalExpenseByWalletId(@PathVariable UUID walletId) {
        return transactionService.getTotalExpenseByWalletId(walletId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Transaction create(@RequestBody Transaction transaction) {
        return transactionService.create(transaction);
    }

    @PutMapping("/{id}")
    public Transaction update(@PathVariable UUID id, @RequestBody Transaction transaction) {
        return transactionService.update(id, transaction);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        transactionService.delete(id);
    }
}
