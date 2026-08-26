package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.DebtRequest;
import com.fintech.smartwealth.dto.DebtResponse;
import com.fintech.smartwealth.dto.SettleDebtRequest;
import com.fintech.smartwealth.service.DebtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/debts")
@RequiredArgsConstructor
public class DebtController {
    private final DebtService debtService;

    @GetMapping
    public List<DebtResponse> findAll() {
        return debtService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DebtResponse create(@Valid @RequestBody DebtRequest request) {
        return debtService.create(request);
    }

    @PutMapping("/{id}")
    public DebtResponse update(@PathVariable UUID id, @Valid @RequestBody DebtRequest request) {
        return debtService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        debtService.delete(id);
    }

    @PostMapping("/{id}/settle")
    public DebtResponse settle(@PathVariable UUID id, @Valid @RequestBody SettleDebtRequest request) {
        return debtService.settleDebt(id, request);
    }
}
