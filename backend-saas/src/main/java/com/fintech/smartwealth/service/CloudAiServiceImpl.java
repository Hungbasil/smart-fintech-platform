package com.fintech.smartwealth.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import com.fintech.smartwealth.dto.AiChatResponse;

@Service
@ConditionalOnProperty(name = "app.ai.provider", havingValue = "cloud")
public class CloudAiServiceImpl implements AiChatService {
    @Override
    public String ask(String prompt) {
        return "Cloud AI provider is not configured yet. Add your Gemini, Groq, or OpenAI integration here.";
    }

    @Override public AiChatResponse enrichChat(String answer, String userMessage) { return AiAssistantActions.enrich(answer, userMessage); }
}
