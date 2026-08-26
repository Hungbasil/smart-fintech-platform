package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.DebtRequest;
import com.fintech.smartwealth.dto.DebtResponse;
import com.fintech.smartwealth.dto.SettleDebtRequest;
import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.Debt;
import com.fintech.smartwealth.entity.DebtStatus;
import com.fintech.smartwealth.entity.DebtType;
import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.DebtRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DebtService {
    private final DebtRepository debtRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final SecurityUtils securityUtils;

    @Transactional(readOnly = true)
    public List<DebtResponse> findAll() {
        return debtRepository.findByUserIdOrderByStatusAscDueDateAsc(securityUtils.getCurrentUserId())
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public DebtResponse create(DebtRequest request) {
        User user = currentUser();
        Debt debt = new Debt();
        debt.setUser(user);
        apply(debt, request);
        debt.setStatus(DebtStatus.PENDING);
        return toResponse(debtRepository.save(debt));
    }

    @Transactional
    public DebtResponse update(UUID id, DebtRequest request) {
        Debt debt = ownedDebt(id);
        if (debt.getStatus() == DebtStatus.SETTLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Settled debts cannot be updated");
        }
        apply(debt, request);
        return toResponse(debtRepository.save(debt));
    }

    @Transactional
    public void delete(UUID id) {
        Debt debt = ownedDebt(id);
        if (debt.getStatus() == DebtStatus.SETTLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Settled debts cannot be deleted");
        }
        debtRepository.delete(debt);
    }

    @Transactional
    public DebtResponse settleDebt(UUID id, SettleDebtRequest request) {
        Debt debt = ownedDebt(id);
        if (debt.getStatus() == DebtStatus.SETTLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debt is already settled");
        }

        Wallet wallet = walletRepository.findByIdAndUserId(request.walletId(), securityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        boolean received = debt.getType() == DebtType.LEND;
        BigDecimal delta = received ? debt.getAmount() : debt.getAmount().negate();
        BigDecimal updatedBalance = wallet.getBalance().add(delta);
        if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
        }

        Category category = settlementCategory(debt.getUser(), received);
        Transaction transaction = new Transaction();
        transaction.setAmount(debt.getAmount());
        transaction.setDescription("Debt settlement: " + debt.getCounterpartyName());
        transaction.setTransactionDate(LocalDateTime.now());
        transaction.setTransactionType("DEBT_SETTLEMENT");
        transaction.setWallet(wallet);
        transaction.setCategory(category);

        wallet.setBalance(updatedBalance);
        walletRepository.save(wallet);
        transactionRepository.save(transaction);
        debt.setStatus(DebtStatus.SETTLED);
        return toResponse(debtRepository.save(debt));
    }

    private void apply(Debt debt, DebtRequest request) {
        debt.setCounterpartyName(request.counterpartyName().trim());
        debt.setAmount(request.amount());
        debt.setType(request.type());
        debt.setDueDate(request.dueDate());
        debt.setDescription(request.description() == null ? null : request.description().trim());
    }

    private Category settlementCategory(User user, boolean received) {
        String name = received ? "Debt received" : "Debt repayment";
        String type = received ? "INCOME" : "EXPENSE";
        return categoryRepository.findByUserIdAndName(user.getId(), name).orElseGet(() -> {
            Category category = new Category();
            category.setName(name);
            category.setType(type);
            category.setUser(user);
            return categoryRepository.save(category);
        });
    }

    private User currentUser() {
        return userRepository.findById(securityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Debt ownedDebt(UUID id) {
        return debtRepository.findByIdAndUserId(id, securityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Debt not found"));
    }

    private DebtResponse toResponse(Debt debt) {
        return new DebtResponse(debt.getId(), debt.getCounterpartyName(), debt.getAmount(), debt.getType(),
                debt.getStatus(), debt.getDueDate(), debt.getDescription());
    }
}
