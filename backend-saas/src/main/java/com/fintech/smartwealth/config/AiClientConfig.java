package com.fintech.smartwealth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AiClientConfig {
    @Bean
    public WebClient ollamaWebClient(@Value("${ollama.url:http://localhost:11434}") String ollamaUrl) {
        return WebClient.builder()
                .baseUrl(ollamaUrl)
                .build();
    }
}
