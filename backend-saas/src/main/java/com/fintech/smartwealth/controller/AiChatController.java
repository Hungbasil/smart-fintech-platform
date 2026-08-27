package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.AiChatRequest;
import com.fintech.smartwealth.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {
    private final AiChatService aiChatService;

    @PostMapping("/chat")
    public String chat(@Valid @RequestBody AiChatRequest request) {
        String prompt = "Bạn là trợ lý tài chính thông minh, trả lời ngắn gọn: " + request.message().trim();
        return aiChatService.ask(prompt);
    }
}
