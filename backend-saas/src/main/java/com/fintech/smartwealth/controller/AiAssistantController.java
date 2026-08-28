package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.CreateTransactionRequest;
import com.fintech.smartwealth.dto.TransactionResponse;
import com.fintech.smartwealth.dto.VoiceTransactionRequest;
import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.service.AiAssistantService;
import com.fintech.smartwealth.service.TransactionService;
import com.fintech.smartwealth.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiAssistantController {

    private final AiAssistantService aiAssistantService;
    private final TransactionService transactionService;
    private final CategoryRepository categoryRepository;
    private final SecurityUtils securityUtils;

    @PostMapping("/voice-to-transaction")
    public TransactionResponse voiceToTransaction(@Valid @RequestBody VoiceTransactionRequest request) {
        AiAssistantService.ExtractedTransaction extracted = aiAssistantService.extractTransactionData(request.text());
        Category category = categoryRepository.findAvailableExpenseByUserIdAndName(
                        securityUtils.getCurrentUserId(), extracted.category())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "Không tìm thấy danh mục chi tiêu: " + extracted.category()));

        CreateTransactionRequest transaction = new CreateTransactionRequest();
        transaction.setAmount(extracted.amount());
        transaction.setDescription(extracted.note().isBlank() ? request.text().trim() : extracted.note());
        transaction.setTransactionDate(request.transactionDate());
        transaction.setWalletId(request.walletId());
        transaction.setCategoryId(category.getId());
        return transactionService.create(transaction);
    }
}