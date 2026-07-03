package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public List<Wallet> findAll() {
        return walletService.findAll();
    }

    @GetMapping("/{id}")
    public Wallet findById(@PathVariable UUID id) {
        return walletService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Wallet create(@RequestBody Wallet wallet) {
        return walletService.create(wallet);
    }

    @PutMapping("/{id}")
    public Wallet update(@PathVariable UUID id, @RequestBody Wallet wallet) {
        return walletService.update(id, wallet);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        walletService.delete(id);
    }
}
