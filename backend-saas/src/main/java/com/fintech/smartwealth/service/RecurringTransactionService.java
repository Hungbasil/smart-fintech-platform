package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.RecurringTransactionRequest;
import com.fintech.smartwealth.dto.RecurringTransactionResponse;
import com.fintech.smartwealth.entity.*;
import com.fintech.smartwealth.repository.*;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class RecurringTransactionService {
    private final RecurringTransactionRepository recurringRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final RecurringTransactionExecutionRepository executionRepository;
    private final SecurityUtils securityUtils;

    public List<RecurringTransactionResponse> findAll() { return recurringRepository.findByUserId(securityUtils.getCurrentUserId()).stream().map(this::response).toList(); }

    @Transactional public RecurringTransactionResponse save(RecurringTransactionRequest request, UUID id) {
        UUID userId = securityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow(() -> notFound("User"));
        Wallet wallet = walletRepository.findByIdAndUserId(request.getWalletId(), userId).orElseThrow(() -> notFound("Wallet"));
        ensureWalletIsActive(wallet);
        Category category = categoryRepository.findByIdAndUserId(request.getCategoryId(), userId).orElseThrow(() -> notFound("Category"));
        RecurringTransaction item = id == null ? new RecurringTransaction() : recurringRepository.findByIdAndUserId(id, userId).orElseThrow(() -> notFound("Recurring transaction"));
        item.setUser(user); item.setWallet(wallet); item.setCategory(category); item.setAmount(request.getAmount()); item.setDescription(request.getDescription()); item.setDayOfMonth(request.getDayOfMonth()); item.setActive(request.isActive());
        return response(recurringRepository.save(item));
    }

    public void delete(UUID id) { recurringRepository.delete(recurringRepository.findByIdAndUserId(id, securityUtils.getCurrentUserId()).orElseThrow(() -> notFound("Recurring transaction"))); }

    @Transactional
    public RecurringTransactionResponse skipNext(UUID id) {
        RecurringTransaction item = recurringRepository.findByIdAndUserId(id, securityUtils.getCurrentUserId())
                .orElseThrow(() -> notFound("Recurring transaction"));
        if (!item.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paused recurring transactions cannot skip a cycle");
        }
        LocalDate today = LocalDate.now();
        YearMonth month = YearMonth.from(today);
        int effectiveDay = Math.min(item.getDayOfMonth(), month.lengthOfMonth());
        String currentMonth = month.toString();
        boolean currentMonthAvailable = effectiveDay >= today.getDayOfMonth()
                && !executionRepository.existsByRecurringTransactionIdAndExecutionMonth(item.getId(), currentMonth);
        item.setSkippedMonth((currentMonthAvailable ? month : month.plusMonths(1)).toString());
        return response(recurringRepository.save(item));
    }

    @Scheduled(cron = "0 5 0 * * *")
    @Transactional public void processDueTransactions() {
        LocalDate today = LocalDate.now();
        String executionMonth = YearMonth.from(today).toString();
        for (RecurringTransaction item : recurringRepository.findByActiveTrue()) {
            if (item.getWallet().isFrozen()) continue;
            int effectiveDay = Math.min(item.getDayOfMonth(), YearMonth.from(today).lengthOfMonth());
            if (effectiveDay > today.getDayOfMonth()
                    || executionMonth.equals(item.getSkippedMonth())
                    || executionRepository.existsByRecurringTransactionIdAndExecutionMonth(item.getId(), executionMonth)) continue;
            BigDecimal delta = "EXPENSE".equalsIgnoreCase(item.getCategory().getType()) ? item.getAmount().negate() : item.getAmount();
            BigDecimal balance = item.getWallet().getBalance().add(delta);
            if (balance.compareTo(BigDecimal.ZERO) < 0) continue;
            item.getWallet().setBalance(balance);
            Transaction transaction = new Transaction(); transaction.setAmount(item.getAmount()); transaction.setDescription(item.getDescription()); transaction.setTransactionDate(LocalDateTime.now()); transaction.setWallet(item.getWallet()); transaction.setCategory(item.getCategory());
            Transaction saved = transactionRepository.save(transaction);
            RecurringTransactionExecution execution = new RecurringTransactionExecution();
            execution.setRecurringTransaction(item);
            execution.setExecutionMonth(executionMonth);
            execution.setTransaction(saved);
            executionRepository.save(execution);
            item.setLastProcessed(today); item.setSkippedMonth(null); recurringRepository.save(item); walletRepository.save(item.getWallet());
        }
    }

    private RecurringTransactionResponse response(RecurringTransaction item) {
        LocalDate today = LocalDate.now();
        YearMonth month = YearMonth.from(today);
        int effectiveDay = Math.min(item.getDayOfMonth(), month.lengthOfMonth());
        LocalDate nextRun = month.atDay(effectiveDay);
        if (!nextRun.isAfter(today) || month.toString().equals(item.getSkippedMonth())) {
            month = month.plusMonths(1);
            nextRun = month.atDay(Math.min(item.getDayOfMonth(), month.lengthOfMonth()));
        }
        return new RecurringTransactionResponse(item.getId(), item.getWallet().getId(), item.getCategory().getId(), item.getDescription(), item.getAmount(), item.getDayOfMonth(), item.isActive(), item.getLastProcessed(), nextRun, item.getSkippedMonth());
    }
    private ResponseStatusException notFound(String type) { return new ResponseStatusException(HttpStatus.NOT_FOUND, type + " not found"); }

    private void ensureWalletIsActive(Wallet wallet) {
        if (wallet.isFrozen()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Wallet is frozen");
        }
    }
}