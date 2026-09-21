package com.fintech.smartwealth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiChatRequest(
        @NotBlank(message = "Message is required")
        @Size(max = 2000, message = "Message must not exceed 2000 characters")
        String message,
        @Size(max = 14_000_000, message = "Image is too large")
        String image
) {
}
