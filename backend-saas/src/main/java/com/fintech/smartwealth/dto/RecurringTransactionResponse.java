package com.fintech.smartwealth.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
public record RecurringTransactionResponse(UUID id, UUID walletId, UUID categoryId, String description, BigDecimal amount, Integer dayOfMonth, boolean active, LocalDate lastProcessed) {}