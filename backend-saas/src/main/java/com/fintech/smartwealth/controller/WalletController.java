package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.CreateWalletRequest;
import com.fintech.smartwealth.dto.WalletResponse;
import com.fintech.smartwealth.service.WalletService;
import jakarta.validation.Valid;
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
    public List<WalletResponse> findAll() {
        return walletService.findAll();
    }

    @GetMapping("/{id}")
    public WalletResponse findById(@PathVariable UUID id) {
        return walletService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WalletResponse create(@Valid @RequestBody CreateWalletRequest request) {
        return walletService.create(request);
    }

    @PutMapping("/{id}")
    public WalletResponse update(@PathVariable UUID id, @Valid @RequestBody CreateWalletRequest request) {
        return walletService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        walletService.delete(id);
    }
}
