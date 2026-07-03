package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public List<Transaction> findAll() {
        return transactionRepository.findAll();
    }

    public Transaction findById(UUID id) {
        return transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
    }

    public Transaction create(Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    public Transaction update(UUID id, Transaction transaction) {
        Transaction existing = findById(id);
        existing.setAmount(transaction.getAmount());
        existing.setDescription(transaction.getDescription());
        existing.setTransactionDate(transaction.getTransactionDate());
        existing.setWallet(transaction.getWallet());
        existing.setCategory(transaction.getCategory());
        return transactionRepository.save(existing);
    }

    public void delete(UUID id) {
        if (!transactionRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found");
        }
        transactionRepository.deleteById(id);
    }

    public BigDecimal getTotalExpenseByWalletId(UUID walletId) {
        return transactionRepository.sumExpenseByWalletId(walletId);
    }
}
