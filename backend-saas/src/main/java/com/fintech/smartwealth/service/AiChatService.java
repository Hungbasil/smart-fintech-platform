package com.fintech.smartwealth.service;

public interface AiChatService {
    String ask(String prompt);

    default String ask(String prompt, String imageBase64) {
        return ask(prompt);
    }
}
