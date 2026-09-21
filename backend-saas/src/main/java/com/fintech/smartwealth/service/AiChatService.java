package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.AiChatResponse;

public interface AiChatService {
    String ask(String prompt);

    default String ask(String prompt, String imageBase64) {
        return ask(prompt);
    }

    AiChatResponse enrichChat(String answer, String userMessage);

}
