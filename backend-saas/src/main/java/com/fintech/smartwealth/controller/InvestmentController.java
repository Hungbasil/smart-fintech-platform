package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.InvestmentRequest;
import com.fintech.smartwealth.dto.InvestmentResponse;
import com.fintech.smartwealth.service.InvestmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/investments")
@RequiredArgsConstructor
public class InvestmentController {
    private final InvestmentService investmentService;

    @GetMapping
    public List<InvestmentResponse> findAll() {
        return investmentService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InvestmentResponse create(@Valid @RequestBody InvestmentRequest request) {
        return investmentService.create(request);
    }

    @PutMapping("/{id}")
    public InvestmentResponse update(@PathVariable UUID id, @Valid @RequestBody InvestmentRequest request) {
        return investmentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        investmentService.delete(id);
    }
}
