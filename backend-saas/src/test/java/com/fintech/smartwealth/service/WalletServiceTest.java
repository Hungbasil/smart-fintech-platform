package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.CreateWalletRequest;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.entity.Wallet;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SecurityUtils securityUtils;

    @InjectMocks
    private WalletService walletService;

    @Test
    void createShouldUseCurrentUserWhenNoUserIdWasProvided() {
        UUID currentUserId = UUID.randomUUID();
        CreateWalletRequest request = new CreateWalletRequest();
        request.setName("Primary");
        request.setBalance(new BigDecimal("100.00"));
        request.setUserId(null);

        User user = new User();
        user.setId(currentUserId);

        when(securityUtils.getCurrentUserId()).thenReturn(currentUserId);
        when(userRepository.findById(currentUserId)).thenReturn(Optional.of(user));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> {
            Wallet saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        walletService.create(request);

        ArgumentCaptor<Wallet> walletCaptor = ArgumentCaptor.forClass(Wallet.class);
        verify(walletRepository).save(walletCaptor.capture());
        assertThat(walletCaptor.getValue().getUser().getId()).isEqualTo(currentUserId);
    }
}
