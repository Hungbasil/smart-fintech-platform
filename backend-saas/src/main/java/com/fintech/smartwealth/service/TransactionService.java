package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.CreateTransactionRequest;
import com.fintech.smartwealth.dto.TransactionResponse;
import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.CategoryRepository;
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
    private final CategoryRepository categoryRepository;

    public List<TransactionResponse> findAll() {
        return transactionRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public TransactionResponse findById(UUID id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
        return toResponse(transaction);
    }

    @Transactional
    public TransactionResponse create(CreateTransactionRequest request) {
        Wallet wallet = walletRepository.findById(request.getWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        Transaction transaction = new Transaction();
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setWallet(wallet);
        transaction.setCategory(category);

        BigDecimal delta = resolveDelta(transaction);
        BigDecimal updatedBalance = wallet.getBalance().add(delta);
        if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
        }

        wallet.setBalance(updatedBalance);
        walletRepository.save(wallet);
        return toResponse(transactionRepository.save(transaction));
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

    private TransactionResponse toResponse(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getAmount(),
                transaction.getDescription(),
                transaction.getTransactionDate(),
                transaction.getWallet().getId(),
                transaction.getCategory().getId()
        );
    }
}
