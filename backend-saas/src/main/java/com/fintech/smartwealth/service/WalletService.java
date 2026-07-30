package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.CreateWalletRequest;
import com.fintech.smartwealth.dto.WalletResponse;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final UserRepository userRepository;

    public List<WalletResponse> findAll() {
        return walletRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public WalletResponse findById(UUID id) {
        Wallet wallet = walletRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        return toResponse(wallet);
    }

    public WalletResponse create(CreateWalletRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Wallet wallet = new Wallet();
        wallet.setName(request.getName());
        wallet.setBalance(request.getBalance());
        wallet.setUser(user);

        return toResponse(walletRepository.save(wallet));
    }

    public void delete(UUID id) {
        if (!walletRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found");
        }
        walletRepository.deleteById(id);
    }

    private WalletResponse toResponse(Wallet wallet) {
        return new WalletResponse(wallet.getId(), wallet.getName(), wallet.getBalance(), wallet.getUser().getId());
    }
}
