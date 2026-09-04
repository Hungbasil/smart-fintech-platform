package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.CreateTransactionRequest;
import com.fintech.smartwealth.dto.DebtRequest;
import com.fintech.smartwealth.dto.TransactionResponse;
import com.fintech.smartwealth.dto.TransferRequest;
import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.DebtType;
import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.BudgetRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private BudgetRepository budgetRepository;

    @Mock
    private DebtService debtService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SecurityUtils securityUtils;

    @InjectMocks
    private TransactionService transactionService;

    @Test
    void findAllWithoutFiltersShouldUseUserScopedNoFilterQuery() {
        UUID userId = UUID.randomUUID();
        Pageable pageable = org.springframework.data.domain.Pageable.unpaged();

        when(securityUtils.isAdmin()).thenReturn(false);
        when(securityUtils.getCurrentUserId()).thenReturn(userId);
        when(transactionRepository.findAllByWalletUserId(userId, "", pageable)).thenReturn(Page.empty(pageable));

        transactionService.findAll(null, null, null, null, null, null, pageable);

        verify(transactionRepository).findAllByWalletUserId(userId, "", pageable);
    }

    @Test
    void importFileShouldRejectFilesOverTenMegabytes() {
        byte[] oversizedContent = new byte[10 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile("file", "transactions.csv", "text/csv", oversizedContent);

        assertThatThrownBy(() -> transactionService.importFile(file))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("must not exceed 10 MB");
    }

    @Test
    void createExpenseShouldReduceWalletBalance() {
        Wallet wallet = new Wallet();
        wallet.setId(UUID.randomUUID());
        wallet.setBalance(new BigDecimal("100.00"));

        Category category = new Category();
        category.setId(UUID.randomUUID());
        category.setType("EXPENSE");

        CreateTransactionRequest request = new CreateTransactionRequest();
        request.setAmount(new BigDecimal("25.00"));
        request.setDescription("Lunch");
        request.setTransactionDate(java.time.LocalDateTime.now());
        request.setWalletId(wallet.getId());
        request.setCategoryId(category.getId());

        wallet.setUser(new com.fintech.smartwealth.entity.User());
        wallet.getUser().setId(UUID.randomUUID());
        category.setUser(wallet.getUser());

        when(walletRepository.findById(wallet.getId())).thenReturn(Optional.of(wallet));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(securityUtils.isAdmin()).thenReturn(false);
        when(securityUtils.getCurrentUserId()).thenReturn(wallet.getUser().getId());
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> {
            Transaction saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TransactionResponse saved = transactionService.create(request);

        assertThat(saved.getAmount()).isEqualByComparingTo("25.00");
        assertThat(wallet.getBalance()).isEqualByComparingTo("75.00");
        verify(walletRepository).save(wallet);
    }

    @Test
    void createIncomeShouldIncreaseWalletBalance() {
        Wallet wallet = new Wallet();
        wallet.setId(UUID.randomUUID());
        wallet.setBalance(new BigDecimal("100.00"));

        Category category = new Category();
        category.setId(UUID.randomUUID());
        category.setType("INCOME");
        wallet.setUser(new com.fintech.smartwealth.entity.User());
        wallet.getUser().setId(UUID.randomUUID());
        category.setUser(wallet.getUser());

        CreateTransactionRequest request = new CreateTransactionRequest();
        request.setAmount(new BigDecimal("25.00"));
        request.setDescription("Salary");
        request.setTransactionDate(java.time.LocalDateTime.now());
        request.setWalletId(wallet.getId());
        request.setCategoryId(category.getId());

        when(walletRepository.findById(wallet.getId())).thenReturn(Optional.of(wallet));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(securityUtils.isAdmin()).thenReturn(false);
        when(securityUtils.getCurrentUserId()).thenReturn(wallet.getUser().getId());
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> {
            Transaction saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        transactionService.create(request);

        assertThat(wallet.getBalance()).isEqualByComparingTo("125.00");
        verify(walletRepository).save(wallet);
    }

    @Test
    void createAnomalousExpenseShouldSendNotificationAfterSaving() {
        UUID userId = UUID.randomUUID();
        Wallet wallet = wallet(userId, "1000000.00");
        Category category = new Category();
        category.setId(UUID.randomUUID());
        category.setName("Dining");
        category.setType("EXPENSE");
        category.setUser(wallet.getUser());

        java.time.LocalDateTime transactionDate = java.time.LocalDateTime.now();
        CreateTransactionRequest request = new CreateTransactionRequest();
        request.setAmount(new BigDecimal("600000.00"));
        request.setDescription("Large dinner");
        request.setTransactionDate(transactionDate);
        request.setWalletId(wallet.getId());
        request.setCategoryId(category.getId());

        Transaction firstExpense = new Transaction();
        firstExpense.setAmount(new BigDecimal("150000.00"));
        Transaction secondExpense = new Transaction();
        secondExpense.setAmount(new BigDecimal("200000.00"));

        when(walletRepository.findById(wallet.getId())).thenReturn(Optional.of(wallet));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(securityUtils.isAdmin()).thenReturn(false);
        when(securityUtils.getCurrentUserId()).thenReturn(userId);
        when(transactionRepository.findExpenseHistoryByUserAndCategoryBetween(
                org.mockito.ArgumentMatchers.eq(userId),
                org.mockito.ArgumentMatchers.eq(category.getId()),
                any(java.time.LocalDateTime.class),
                org.mockito.ArgumentMatchers.eq(transactionDate)))
                .thenReturn(List.of(firstExpense, secondExpense));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        transactionService.create(request);

        verify(transactionRepository).save(any(Transaction.class));
        verify(notificationService).sendNotification(userId,
                "Cảnh báo: Bạn vừa chi một khoản Dining cao bất thường so với thói quen 3 tháng qua!");
    }

    @Test
    void createSplitExpenseShouldCreateOneLendDebtPerPerson() {
        UUID userId = UUID.randomUUID();
        Wallet wallet = wallet(userId, "100.00");
        Category category = new Category();
        category.setId(UUID.randomUUID());
        category.setType("EXPENSE");

        CreateTransactionRequest request = new CreateTransactionRequest();
        request.setAmount(new BigDecimal("90.00"));
        request.setDescription("Dinner");
        request.setTransactionDate(java.time.LocalDateTime.now());
        request.setWalletId(wallet.getId());
        request.setCategoryId(category.getId());
        request.setIsSplit(true);
        request.setSplitWithNames(List.of("Alice", " Bob "));

        when(walletRepository.findById(wallet.getId())).thenReturn(Optional.of(wallet));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(securityUtils.isAdmin()).thenReturn(false);
        when(securityUtils.getCurrentUserId()).thenReturn(userId);
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        transactionService.create(request);

        assertThat(wallet.getBalance()).isEqualByComparingTo("10.00");
        verify(debtService, org.mockito.Mockito.times(2)).create(any(DebtRequest.class));
        verify(debtService).create(org.mockito.ArgumentMatchers.argThat(debt ->
                debt.counterpartyName().equals("Alice")
                        && debt.amount().compareTo(new BigDecimal("30.00")) == 0
                        && debt.type() == DebtType.LEND));
        verify(debtService).create(org.mockito.ArgumentMatchers.argThat(debt ->
                debt.counterpartyName().equals("Bob")
                        && debt.amount().compareTo(new BigDecimal("30.00")) == 0
                        && debt.type() == DebtType.LEND));
    }

    @Test
    void transferShouldMoveBalanceAndCreateTwoTransactions() {
        UUID userId = UUID.randomUUID();
        Wallet fromWallet = wallet(userId, "100.00");
        Wallet toWallet = wallet(userId, "25.00");
        Category transferCategory = new Category();
        transferCategory.setId(UUID.randomUUID());
        transferCategory.setName("Transfer");
        transferCategory.setType("TRANSFER");
        transferCategory.setUser(fromWallet.getUser());

        TransferRequest request = new TransferRequest();
        request.setFromWalletId(fromWallet.getId());
        request.setToWalletId(toWallet.getId());
        request.setAmount(new BigDecimal("40.00"));
        request.setDescription("Move savings");
        request.setTransactionDate(java.time.LocalDateTime.now());

        when(walletRepository.findById(fromWallet.getId())).thenReturn(Optional.of(fromWallet));
        when(walletRepository.findById(toWallet.getId())).thenReturn(Optional.of(toWallet));
        when(categoryRepository.findByUserIdAndName(userId, "Transfer")).thenReturn(Optional.of(transferCategory));
        when(securityUtils.isAdmin()).thenReturn(false);
        when(securityUtils.getCurrentUserId()).thenReturn(userId);
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TransactionResponse response = transactionService.transferFunds(request);

        assertThat(fromWallet.getBalance()).isEqualByComparingTo("60.00");
        assertThat(toWallet.getBalance()).isEqualByComparingTo("65.00");
        assertThat(response.getType()).isEqualTo("TRANSFER");
        verify(transactionRepository, org.mockito.Mockito.times(2)).save(any(Transaction.class));
    }

    @Test
    void transferShouldRejectInsufficientBalance() {
        UUID userId = UUID.randomUUID();
        Wallet fromWallet = wallet(userId, "10.00");
        Wallet toWallet = wallet(userId, "25.00");
        TransferRequest request = new TransferRequest();
        request.setFromWalletId(fromWallet.getId());
        request.setToWalletId(toWallet.getId());
        request.setAmount(new BigDecimal("40.00"));

        when(walletRepository.findById(fromWallet.getId())).thenReturn(Optional.of(fromWallet));
        when(walletRepository.findById(toWallet.getId())).thenReturn(Optional.of(toWallet));
        when(securityUtils.isAdmin()).thenReturn(false);
        when(securityUtils.getCurrentUserId()).thenReturn(userId);

        assertThatThrownBy(() -> transactionService.transferFunds(request))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Insufficient wallet balance");
    }

    private Wallet wallet(UUID userId, String balance) {
        Wallet wallet = new Wallet();
        wallet.setId(UUID.randomUUID());
        wallet.setBalance(new BigDecimal(balance));
        com.fintech.smartwealth.entity.User user = new com.fintech.smartwealth.entity.User();
        user.setId(userId);
        wallet.setUser(user);
        return wallet;
    }
}
