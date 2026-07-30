package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private WalletRepository walletRepository;

    @InjectMocks
    private TransactionService transactionService;

    @Test
    void createExpenseShouldReduceWalletBalance() {
        Wallet wallet = new Wallet();
        wallet.setId(UUID.randomUUID());
        wallet.setBalance(new BigDecimal("100.00"));

        Category category = new Category();
        category.setType("EXPENSE");

        Transaction transaction = new Transaction();
        transaction.setAmount(new BigDecimal("25.00"));
        transaction.setWallet(wallet);
        transaction.setCategory(category);

        when(walletRepository.findById(wallet.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Transaction saved = transactionService.create(transaction);

        assertThat(saved.getAmount()).isEqualByComparingTo("25.00");
        assertThat(wallet.getBalance()).isEqualByComparingTo("75.00");
        verify(walletRepository).save(wallet);
    }
}
