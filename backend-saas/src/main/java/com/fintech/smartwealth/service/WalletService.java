package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.Wallet;
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

    public List<Wallet> findAll() {
        return walletRepository.findAll();
    }

    public Wallet findById(UUID id) {
        return walletRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
    }

    public Wallet create(Wallet wallet) {
        return walletRepository.save(wallet);
    }

    public Wallet update(UUID id, Wallet wallet) {
        Wallet existing = findById(id);
        existing.setName(wallet.getName());
        existing.setBalance(wallet.getBalance());
        existing.setUser(wallet.getUser());
        return walletRepository.save(existing);
    }

    public void delete(UUID id) {
        if (!walletRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found");
        }
        walletRepository.deleteById(id);
    }
}
