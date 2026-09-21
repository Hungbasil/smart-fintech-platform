package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.*;
import com.fintech.smartwealth.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private BudgetRepository budgetRepository;

    @Mock
    private RecurringTransactionRepository recurringTransactionRepository;

    @Mock
    private SavingGoalRepository savingGoalRepository;

    @Mock
    private DebtRepository debtRepository;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private AdminService adminService;

    @Test
    void deleteUserShouldDeleteDependentRecordsBeforeRemovingUser() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("user@example.com");

        Category category = new Category();
        category.setId(UUID.randomUUID());
        category.setUser(user);
        category.setName("Food");
        category.setType("EXPENSE");

        Wallet wallet = new Wallet();
        wallet.setId(UUID.randomUUID());
        wallet.setUser(user);
        wallet.setName("Main");
        wallet.setBalance(BigDecimal.valueOf(100));
        wallet.setTransactions(List.of());

        Transaction transaction = new Transaction();
        transaction.setId(UUID.randomUUID());
        transaction.setWallet(wallet);
        transaction.setCategory(category);
        transaction.setAmount(BigDecimal.TEN);
        transaction.setTransactionDate(LocalDateTime.now());

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(walletRepository.findByUserId(userId)).thenReturn(List.of(wallet));
        when(transactionRepository.findByWalletUserId(userId)).thenReturn(List.of(transaction));
        when(categoryRepository.findByUserId(userId)).thenReturn(List.of(category));
        when(budgetRepository.findByUserId(userId)).thenReturn(List.of());
        when(recurringTransactionRepository.findByUserId(userId)).thenReturn(List.of());
        when(savingGoalRepository.findByUserId(userId)).thenReturn(List.of());
        when(debtRepository.findByUserIdOrderByStatusAscDueDateAsc(userId)).thenReturn(List.of());

        adminService.deleteUser(userId);

        ArgumentCaptor<List<Transaction>> transactionCaptor = ArgumentCaptor.forClass(List.class);
        verify(transactionRepository).deleteAll(transactionCaptor.capture());
        assertThat(transactionCaptor.getValue()).containsExactly(transaction);

        verify(walletRepository).deleteAll(List.of(wallet));
        verify(categoryRepository).deleteAll(List.of(category));
        verify(userRepository).delete(user);
        verify(auditService).logAdminAction(eq("DELETE_USER"), anyString(), eq(userId.toString()));
    }
}
