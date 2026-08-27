package com.fintech.smartwealth.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.ai.provider", havingValue = "ollama", matchIfMissing = true)
public class OllamaAiServiceImpl implements AiChatService {
    private final WebClient ollamaWebClient;

    @Value("${ollama.text-model:qwen2.5:latest}")
    private String textModel;

    @Value("${ollama.vision-model:llama3.2-vision:11b}")
    private String visionModel;

    @Override
    public String ask(String prompt) {
        return askWithModel(prompt, null, textModel);
    }

    @Override
    public String ask(String prompt, String imageBase64) {
        if (imageBase64 == null || imageBase64.isBlank()) {
            return ask(prompt);
        }
        return askWithModel(prompt, normalizeImage(imageBase64), visionModel);
    }

    private String normalizeImage(String imageBase64) {
        int separator = imageBase64.indexOf(',');
        return separator >= 0 ? imageBase64.substring(separator + 1) : imageBase64;
    }

    private String askWithModel(String prompt, String imageBase64, String selectedModel) {
        try {
            OllamaRequest request = imageBase64 == null
                    ? new OllamaRequest(selectedModel, false, prompt, null)
                    : new OllamaRequest(selectedModel, false, prompt, List.of(imageBase64));
            JsonNode response = ollamaWebClient.post()
                    .uri("/api/generate")
                    .bodyValue(request)
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

    private record OllamaRequest(String model, boolean stream, String prompt, List<String> images) {
    }
}
