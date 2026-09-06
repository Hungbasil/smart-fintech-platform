package com.fintech.smartwealth.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record AiChatResponse(
        String message,
        List<AiAction> actions,
        List<String> sources,
        OffsetDateTime updatedAt) {
}