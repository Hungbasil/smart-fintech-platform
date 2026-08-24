package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.CreateTransactionRequest;
import com.fintech.smartwealth.dto.TransactionResponse;
import com.fintech.smartwealth.dto.TransferRequest;
import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private SecurityUtils securityUtils;

    @InjectMocks
    private TransactionService transactionService;

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
