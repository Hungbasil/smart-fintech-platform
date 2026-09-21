package com.fintech.smartwealth.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CalendarEventDTO(
        UUID id,
        String title,
        LocalDate date,
        BigDecimal amount,
        String type) {
}