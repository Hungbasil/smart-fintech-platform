package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.AddSavingGoalFundsRequest;
import com.fintech.smartwealth.dto.SavingGoalRequest;
import com.fintech.smartwealth.dto.SavingGoalResponse;
import com.fintech.smartwealth.service.SavingGoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/saving-goals")
@RequiredArgsConstructor
public class SavingGoalController {
    private final SavingGoalService savingGoalService;

    @GetMapping
    public List<SavingGoalResponse> findAll() { return savingGoalService.findAll(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SavingGoalResponse create(@Valid @RequestBody SavingGoalRequest request) { return savingGoalService.create(request); }

    @PutMapping("/{id}")
    public SavingGoalResponse update(@PathVariable UUID id, @Valid @RequestBody SavingGoalRequest request) { return savingGoalService.update(id, request); }

    @PostMapping("/{id}/add-funds")
    public SavingGoalResponse addFunds(@PathVariable UUID id, @Valid @RequestBody AddSavingGoalFundsRequest request) { return savingGoalService.addFunds(id, request); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { savingGoalService.delete(id); }
}