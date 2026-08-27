package com.fintech.smartwealth.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.ai.provider", havingValue = "ollama", matchIfMissing = true)
public class OllamaAiServiceImpl implements AiChatService {
    private final WebClient ollamaWebClient;

    @Value("${ollama.model:qwen2.5:latest}")
    private String model;

    @Override
    public String ask(String prompt) {
        try {
            JsonNode response = ollamaWebClient.post()
                    .uri("/api/generate")
                    .bodyValue(new OllamaRequest(model, false, prompt))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            String answer = response == null ? null : response.path("response").asText(null);
            if (answer == null || answer.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama returned an empty response");
            }
            return answer.trim();
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to reach Ollama", exception);
        }
    }

    private record OllamaRequest(String model, boolean stream, String prompt) {
    }
}
