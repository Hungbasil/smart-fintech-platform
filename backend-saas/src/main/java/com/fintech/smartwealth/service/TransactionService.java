package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;

    public List<Transaction> findAll() {
        return transactionRepository.findAll();
    }

    public Transaction findById(UUID id) {
        return transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
    }

    @Transactional
    public Transaction create(Transaction transaction) {
        Wallet wallet = walletRepository.findById(transaction.getWallet().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        BigDecimal delta = resolveDelta(transaction);
        BigDecimal updatedBalance = wallet.getBalance().add(delta);
        if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
        }

        wallet.setBalance(updatedBalance);
        transaction.setWallet(wallet);
        walletRepository.save(wallet);
        return transactionRepository.save(transaction);
    }

    @Transactional
    public Transaction update(UUID id, Transaction transaction) {
        Transaction existing = findById(id);
        Wallet wallet = walletRepository.findById(transaction.getWallet().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        BigDecimal previousDelta = resolveDelta(existing);
        BigDecimal newDelta = resolveDelta(transaction);
        BigDecimal balanceAdjustment = newDelta.subtract(previousDelta);
        BigDecimal updatedBalance = wallet.getBalance().add(balanceAdjustment);
        if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
        }

        wallet.setBalance(updatedBalance);
        existing.setAmount(transaction.getAmount());
        existing.setDescription(transaction.getDescription());
        existing.setTransactionDate(transaction.getTransactionDate());
        existing.setWallet(wallet);
        existing.setCategory(transaction.getCategory());
        walletRepository.save(wallet);
        return transactionRepository.save(existing);
    }

    @Transactional
    public void delete(UUID id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        Wallet wallet = walletRepository.findById(transaction.getWallet().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        BigDecimal updatedBalance = wallet.getBalance().subtract(resolveDelta(transaction));
        if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
        }

        wallet.setBalance(updatedBalance);
        walletRepository.save(wallet);
        transactionRepository.deleteById(id);
    }

    public BigDecimal getTotalExpenseByWalletId(UUID walletId) {
        return transactionRepository.sumExpenseByWalletId(walletId);
    }

    private BigDecimal resolveDelta(Transaction transaction) {
        if (transaction.getCategory() == null || transaction.getCategory().getType() == null) {
            return BigDecimal.ZERO;
        }
        return "EXPENSE".equalsIgnoreCase(transaction.getCategory().getType())
                ? transaction.getAmount().negate()
                : transaction.getAmount();
    }
}
