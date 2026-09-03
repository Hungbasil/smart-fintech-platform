package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.CreateTransactionRequest;
import com.fintech.smartwealth.dto.OcrResultDTO;
import com.fintech.smartwealth.dto.TransactionResponse;
import com.fintech.smartwealth.dto.TransferRequest;
import com.fintech.smartwealth.dto.UpdateTransactionRequest;
import com.fintech.smartwealth.dto.ImportTransactionsResponse;
import com.fintech.smartwealth.service.TransactionService;
import com.fintech.smartwealth.service.OcrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final OcrService ocrService;

    @GetMapping
    public Page<TransactionResponse> findAll(
            @RequestParam(required = false) UUID walletId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) LocalDateTime fromDate,
            @RequestParam(required = false) LocalDateTime toDate,
            @PageableDefault(size = 20, sort = "transactionDate", direction = Sort.Direction.DESC) Pageable pageable) {
        return transactionService.findAll(walletId, categoryId, type, keyword, fromDate, toDate, pageable);
    }

    @GetMapping("/{id}")
    public TransactionResponse findById(@PathVariable UUID id) {
        return transactionService.findById(id);
    }

    @GetMapping("/wallet/{walletId}/total-expense")
    public BigDecimal getTotalExpenseByWalletId(@PathVariable UUID walletId) {
        return transactionService.getTotalExpenseByWalletId(walletId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse create(@Valid @RequestBody CreateTransactionRequest request) {
        return transactionService.create(request);
    }

    @PostMapping("/transfer")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse transfer(@Valid @RequestBody TransferRequest request) {
        return transactionService.transferFunds(request);
    }

    @PostMapping(value = "/ocr", consumes = "multipart/form-data")
    public OcrResultDTO ocr(@RequestParam("file") MultipartFile file) {
        return ocrService.extract(file);
    }

    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public ImportTransactionsResponse importCsv(@RequestParam("file") MultipartFile file) {
        return transactionService.importFile(file);
    }

    @PutMapping("/{id}")
    public TransactionResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateTransactionRequest request) {
        return transactionService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        transactionService.delete(id);
    }
}
