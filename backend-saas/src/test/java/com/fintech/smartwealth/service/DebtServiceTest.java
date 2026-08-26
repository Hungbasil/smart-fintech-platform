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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DebtServiceTest {
    @Mock private DebtRepository debtRepository;
    @Mock private UserRepository userRepository;
    @Mock private WalletRepository walletRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private SecurityUtils securityUtils;
    @InjectMocks private DebtService debtService;

    @Test
    void settlingLendShouldIncreaseWalletAndCreateIncomeTransaction() {
        UUID userId = UUID.randomUUID();
        Wallet wallet = wallet(userId, "100.00");
        Debt debt = debt(userId, DebtType.LEND, "25.00");
        Category category = category("Debt received", "INCOME", userId);
        stubSettlement(userId, wallet, debt, category);

        DebtResponse response = debtService.settleDebt(debt.getId(), new SettleDebtRequest(wallet.getId()));

        assertThat(wallet.getBalance()).isEqualByComparingTo("125.00");
        assertThat(response.status()).isEqualTo(DebtStatus.SETTLED);
        ArgumentCaptor<Transaction> transaction = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionRepository).save(transaction.capture());
        assertThat(transaction.getValue().getCategory().getType()).isEqualTo("INCOME");
    }

    @Test
    void settlingBorrowShouldDecreaseWalletAndCreateExpenseTransaction() {
        UUID userId = UUID.randomUUID();
        Wallet wallet = wallet(userId, "100.00");
        Debt debt = debt(userId, DebtType.BORROW, "25.00");
        Category category = category("Debt repayment", "EXPENSE", userId);
        stubSettlement(userId, wallet, debt, category);

        debtService.settleDebt(debt.getId(), new SettleDebtRequest(wallet.getId()));

        assertThat(wallet.getBalance()).isEqualByComparingTo("75.00");
        ArgumentCaptor<Transaction> transaction = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionRepository).save(transaction.capture());
        assertThat(transaction.getValue().getCategory().getType()).isEqualTo("EXPENSE");
    }

    @Test
    void userCannotSettleAnotherUsersDebt() {
        UUID ownerId = UUID.randomUUID();
        UUID currentUserId = UUID.randomUUID();
        Debt debt = debt(ownerId, DebtType.LEND, "25.00");
        when(securityUtils.getCurrentUserId()).thenReturn(currentUserId);
        when(debtRepository.findByIdAndUserId(debt.getId(), currentUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> debtService.settleDebt(debt.getId(), new SettleDebtRequest(UUID.randomUUID())))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Debt not found");
    }

    private void stubSettlement(UUID userId, Wallet wallet, Debt debt, Category category) {
        when(securityUtils.getCurrentUserId()).thenReturn(userId);
        when(debtRepository.findByIdAndUserId(debt.getId(), userId)).thenReturn(Optional.of(debt));
        when(walletRepository.findByIdAndUserId(wallet.getId(), userId)).thenReturn(Optional.of(wallet));
        when(categoryRepository.findByUserIdAndName(userId, category.getName())).thenReturn(Optional.of(category));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(debtRepository.save(any(Debt.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Debt debt(UUID userId, DebtType type, String amount) {
        Debt debt = new Debt();
        debt.setId(UUID.randomUUID());
        debt.setUser(user(userId));
        debt.setCounterpartyName("Alex");
        debt.setAmount(new BigDecimal(amount));
        debt.setType(type);
        debt.setStatus(DebtStatus.PENDING);
        return debt;
    }

    private Wallet wallet(UUID userId, String balance) {
        Wallet wallet = new Wallet();
        wallet.setId(UUID.randomUUID());
        wallet.setUser(user(userId));
        wallet.setBalance(new BigDecimal(balance));
        return wallet;
    }

    private Category category(String name, String type, UUID userId) {
        Category category = new Category();
        category.setName(name);
        category.setType(type);
        category.setUser(user(userId));
        return category;
    }

    private User user(UUID id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
