package com.fintech.smartwealth.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OcrResultDTO(BigDecimal amount, LocalDate date) {
}