package com.fintech.smartwealth.config;

import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DatabaseSeederTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private DatabaseSeeder databaseSeeder;

    @Test
    void seedUsersAndWalletsShouldPreserveWalletIdsAndBalancesFromCsv() throws Exception {
        Path csv = Files.createTempFile("wallets", ".csv");
        Files.writeString(csv, "id,user_id,name,type,balance,currency\n"
                + "11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222,My Wallet,BANK,125.50,VND\n");

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            if (user.getId() == null) {
                user.setId(UUID.randomUUID());
            }
            return user;
        });
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Method method = DatabaseSeeder.class.getDeclaredMethod("seedUsersAndWallets", Path.class);
        method.setAccessible(true);
        int userCount = (Integer) method.invoke(databaseSeeder, csv);

        assertThat(userCount).isEqualTo(1);

        ArgumentCaptor<Wallet> walletCaptor = ArgumentCaptor.forClass(Wallet.class);
        verify(walletRepository, atLeastOnce()).save(walletCaptor.capture());
        Wallet savedWallet = walletCaptor.getValue();
        assertThat(savedWallet.getId()).isEqualTo(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        assertThat(savedWallet.getBalance()).isEqualByComparingTo("125.50");
    }
}
