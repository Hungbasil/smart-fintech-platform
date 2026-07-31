package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.CreateTransactionRequest;
import com.fintech.smartwealth.dto.TransactionResponse;
import com.fintech.smartwealth.dto.UpdateTransactionRequest;
import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;

    public Page<TransactionResponse> findAll(UUID walletId,
                                             UUID categoryId,
                                             String type,
                                             LocalDateTime fromDate,
                                             LocalDateTime toDate,
                                             Pageable pageable) {
        return transactionRepository.findAllByFilters(walletId, categoryId, type, fromDate, toDate, pageable)
                .map(this::toResponse);
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

        BigDecimal delta = resolveDelta(transaction.getAmount(), category.getType());
        BigDecimal updatedBalance = wallet.getBalance().add(delta);
        if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
        }

        wallet.setBalance(updatedBalance);
        walletRepository.save(wallet);
        return toResponse(transactionRepository.save(transaction));
    }

    @Transactional
    public TransactionResponse update(UUID id, UpdateTransactionRequest request) {
        Transaction existing = transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        Wallet oldWallet = walletRepository.findById(existing.getWallet().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        Wallet newWallet = walletRepository.findById(request.getWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        BigDecimal oldDelta = resolveDelta(existing.getAmount(), existing.getCategory().getType());
        BigDecimal newDelta = resolveDelta(request.getAmount(), category.getType());

        if (oldWallet.getId().equals(newWallet.getId())) {
            BigDecimal updatedBalance = oldWallet.getBalance().subtract(oldDelta).add(newDelta);
            if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
            }
            oldWallet.setBalance(updatedBalance);
            walletRepository.save(oldWallet);
        } else {
            BigDecimal oldWalletBalance = oldWallet.getBalance().subtract(oldDelta);
            BigDecimal newWalletBalance = newWallet.getBalance().add(newDelta);
            if (oldWalletBalance.compareTo(BigDecimal.ZERO) < 0 || newWalletBalance.compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
            }
            oldWallet.setBalance(oldWalletBalance);
            newWallet.setBalance(newWalletBalance);
            walletRepository.save(oldWallet);
            walletRepository.save(newWallet);
        }

        existing.setAmount(request.getAmount());
        existing.setDescription(request.getDescription());
        existing.setTransactionDate(request.getTransactionDate());
        existing.setWallet(newWallet);
        existing.setCategory(category);

        return toResponse(transactionRepository.save(existing));
    }

    @Transactional
    public void delete(UUID id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        Wallet wallet = walletRepository.findById(transaction.getWallet().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        BigDecimal updatedBalance = wallet.getBalance().subtract(resolveDelta(transaction.getAmount(), transaction.getCategory().getType()));
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
        return resolveDelta(transaction.getAmount(), transaction.getCategory() == null ? null : transaction.getCategory().getType());
    }

    private BigDecimal resolveDelta(BigDecimal amount, String categoryType) {
        if (categoryType == null) {
            return BigDecimal.ZERO;
        }
        return "EXPENSE".equalsIgnoreCase(categoryType)
                ? amount.negate()
                : amount;
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
