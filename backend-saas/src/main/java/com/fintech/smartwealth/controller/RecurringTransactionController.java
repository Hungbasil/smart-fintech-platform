package com.fintech.smartwealth.controller;
import com.fintech.smartwealth.dto.*;
import com.fintech.smartwealth.service.RecurringTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/recurring-transactions") @RequiredArgsConstructor
public class RecurringTransactionController {
    private final RecurringTransactionService service;
    @GetMapping public List<RecurringTransactionResponse> findAll() { return service.findAll(); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public RecurringTransactionResponse create(@Valid @RequestBody RecurringTransactionRequest request) { return service.save(request, null); }
    @PutMapping("/{id}") public RecurringTransactionResponse update(@PathVariable UUID id, @Valid @RequestBody RecurringTransactionRequest request) { return service.save(request, id); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id) { service.delete(id); }
}