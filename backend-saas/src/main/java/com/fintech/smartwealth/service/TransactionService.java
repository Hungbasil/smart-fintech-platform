package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.CreateTransactionRequest;
import com.fintech.smartwealth.dto.TransactionResponse;
import com.fintech.smartwealth.dto.TransferRequest;
import com.fintech.smartwealth.dto.UpdateTransactionRequest;
import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
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
    private final SecurityUtils securityUtils;

    @Transactional(readOnly = true)
    public Page<TransactionResponse> findAll(UUID walletId,
                                             UUID categoryId,
                                             String type,
                                             String keyword,
                                             LocalDateTime fromDate,
                                             LocalDateTime toDate,
                                             Pageable pageable) {
        String normalizedType = type == null ? "" : type;
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        LocalDateTime normalizedFromDate = fromDate == null ? LocalDateTime.of(1, 1, 1, 0, 0) : fromDate;
        LocalDateTime normalizedToDate = toDate == null ? LocalDateTime.of(9999, 12, 31, 23, 59, 59) : toDate;
        if (securityUtils.isAdmin()) {
            return transactionRepository.findAllByFilters(walletId, categoryId, normalizedType, normalizedFromDate, normalizedToDate, normalizedKeyword, pageable)
                    .map(this::toResponse);
        }
        if (normalizedType.isEmpty() && normalizedKeyword.isEmpty() && walletId == null && categoryId == null && fromDate == null && toDate == null) {
            return transactionRepository.findAllByWalletUserId(securityUtils.getCurrentUserId(), normalizedKeyword, pageable)
                .map(this::toResponse);
        }
        if (normalizedType.isEmpty()) {
            return transactionRepository.findAllByWalletUserIdWithoutTypeFilter(securityUtils.getCurrentUserId(), walletId, categoryId, normalizedFromDate, normalizedToDate, normalizedKeyword, pageable)
                .map(this::toResponse);
        }
        return transactionRepository.findAllByWalletUserIdAndFilters(securityUtils.getCurrentUserId(), walletId, categoryId, normalizedType, normalizedFromDate, normalizedToDate, normalizedKeyword, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public TransactionResponse findById(UUID id) {
        Transaction transaction;
        if (securityUtils.isAdmin()) {
            transaction = transactionRepository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
        } else {
            transaction = transactionRepository.findByIdAndWalletUserId(id, securityUtils.getCurrentUserId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
        }
        return toResponse(transaction);
    }

    @Transactional
    @CacheEvict(value = "user_analytics", allEntries = true)
    public TransactionResponse create(CreateTransactionRequest request) {
        Wallet wallet = walletRepository.findById(request.getWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        if (!securityUtils.isAdmin() && !wallet.getUser().getId().equals(securityUtils.getCurrentUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        validateCategoryOwnership(category, wallet.getUser().getId());

        Transaction transaction = new Transaction();
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setWallet(wallet);
        transaction.setCategory(category);
        transaction.setTransactionType("STANDARD");

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
    @CacheEvict(value = "user_analytics", allEntries = true)
    public TransactionResponse transferFunds(TransferRequest request) {
        if (request.getFromWalletId().equals(request.getToWalletId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source and destination wallets must be different");
        }

        Wallet fromWallet = walletRepository.findById(request.getFromWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source wallet not found"));
        Wallet toWallet = walletRepository.findById(request.getToWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Destination wallet not found"));

        if (!securityUtils.isAdmin()) {
            UUID currentUserId = securityUtils.getCurrentUserId();
            if (!fromWallet.getUser().getId().equals(currentUserId)
                    || !toWallet.getUser().getId().equals(currentUserId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
            }
        }

        if (fromWallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient wallet balance");
        }

        Category transferCategory = categoryRepository.findByUserIdAndName(fromWallet.getUser().getId(), "Transfer")
                .orElseGet(() -> {
                    Category category = new Category();
                    category.setName("Transfer");
                    category.setType("TRANSFER");
                    category.setUser(fromWallet.getUser());
                    return categoryRepository.save(category);
                });

        fromWallet.setBalance(fromWallet.getBalance().subtract(request.getAmount()));
        toWallet.setBalance(toWallet.getBalance().add(request.getAmount()));
        walletRepository.save(fromWallet);
        walletRepository.save(toWallet);

        Transaction outgoing = createTransferTransaction(fromWallet, transferCategory, request, "Transfer out");
        Transaction incoming = createTransferTransaction(toWallet, transferCategory, request, "Transfer in");
        transactionRepository.save(outgoing);
        return toResponse(transactionRepository.save(incoming));
    }

    @Transactional
    @CacheEvict(value = "user_analytics", allEntries = true)
    public TransactionResponse update(UUID id, UpdateTransactionRequest request) {
        Transaction existing = transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        if ("TRANSFER".equalsIgnoreCase(existing.getTransactionType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transfer transactions cannot be updated");
        }

        Wallet oldWallet = walletRepository.findById(existing.getWallet().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        Wallet newWallet = walletRepository.findById(request.getWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        if (!securityUtils.isAdmin()) {
            UUID currentUserId = securityUtils.getCurrentUserId();
            if (!oldWallet.getUser().getId().equals(currentUserId) || !newWallet.getUser().getId().equals(currentUserId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
            }
        }
        validateCategoryOwnership(category, newWallet.getUser().getId());

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
    @CacheEvict(value = "user_analytics", allEntries = true)
    public void delete(UUID id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        if ("TRANSFER".equalsIgnoreCase(transaction.getTransactionType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transfer transactions cannot be deleted");
        }

        Wallet wallet = walletRepository.findById(transaction.getWallet().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        if (!securityUtils.isAdmin() && !wallet.getUser().getId().equals(securityUtils.getCurrentUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        BigDecimal updatedBalance = wallet.getBalance().subtract(resolveDelta(transaction.getAmount(), transaction.getCategory().getType()));
        if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
        }

        wallet.setBalance(updatedBalance);
        walletRepository.save(wallet);
        transactionRepository.deleteById(id);
    }

    public BigDecimal getTotalExpenseByWalletId(UUID walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        if (!securityUtils.isAdmin() && !wallet.getUser().getId().equals(securityUtils.getCurrentUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return transactionRepository.sumExpenseByWalletId(walletId);
    }

    private BigDecimal resolveDelta(Transaction transaction) {
        return resolveDelta(transaction.getAmount(), transaction.getCategory() == null ? null : transaction.getCategory().getType());
    }

    private void validateCategoryOwnership(Category category, UUID userId) {
        if (!securityUtils.isAdmin()
            && category.getUser() != null
            && !category.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Category access denied");
        }
    }

    private BigDecimal resolveDelta(BigDecimal amount, String categoryType) {
        if (categoryType == null) {
            return BigDecimal.ZERO;
        }
        return "EXPENSE".equalsIgnoreCase(categoryType)
                ? amount.negate()
                : amount;
    }

    private Transaction createTransferTransaction(Wallet wallet, Category category, TransferRequest request, String direction) {
        Transaction transaction = new Transaction();
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription() + " (" + direction + ")");
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setWallet(wallet);
        transaction.setCategory(category);
        transaction.setTransactionType("TRANSFER");
        return transaction;
    }

    private TransactionResponse toResponse(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getAmount(),
                transaction.getDescription(),
                transaction.getTransactionDate(),
                transaction.getWallet().getId(),
                transaction.getCategory().getId(),
                "TRANSFER".equalsIgnoreCase(transaction.getTransactionType())
                    ? "TRANSFER"
                    : transaction.getCategory().getType().toUpperCase()
        );
    }
}
